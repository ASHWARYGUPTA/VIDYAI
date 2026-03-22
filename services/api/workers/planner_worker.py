import logging
from ..workers.celery_app import celery_app
from ..utils.supabase_client import get_supabase_service_client

logger = logging.getLogger(__name__)


@celery_app.task(name="services.api.workers.planner_worker.run_nightly_rebalancer")
def run_nightly_rebalancer():
    """Rebalance study plans for users who missed yesterday's targets."""
    client = get_supabase_service_client()
    from datetime import date, timedelta
    import asyncio

    yesterday = (date.today() - timedelta(days=1)).isoformat()
    missed = client.table("daily_study_plans").select("user_id, plan_id").eq("plan_date", yesterday).eq("is_completed", False).lt("completion_percent", 50).execute()

    from ..services.planner_service import rebalance_plan
    for row in (missed.data or []):
        try:
            import uuid
            asyncio.get_event_loop().run_until_complete(rebalance_plan(user_id=uuid.UUID(row["user_id"]), reason="nightly_rebalance"))
        except Exception as e:
            logger.warning("Rebalance failed for user", extra={"user_id": row["user_id"], "error": str(e)})

    logger.info("Nightly rebalancer completed", extra={"plans_rebalanced": len(missed.data or [])})
