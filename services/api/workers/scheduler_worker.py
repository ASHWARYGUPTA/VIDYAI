import logging
from datetime import date, timedelta
from ..workers.celery_app import celery_app
from ..utils.supabase_client import get_supabase_service_client

logger = logging.getLogger(__name__)


@celery_app.task(name="services.api.workers.scheduler_worker.run_nightly_scheduler")
def run_nightly_scheduler():
    """Schedule tomorrow's revision cards for all active users."""
    client = get_supabase_service_client()
    tomorrow = (date.today() + timedelta(days=1)).isoformat()

    users = client.table("profiles").select("id").eq("onboarding_completed", True).execute()
    for user in (users.data or []):
        user_id = user["id"]
        due = client.table("learner_concept_states").select("concept_id, next_review_date, mastery_score, interval_days").eq("user_id", user_id).lte("next_review_date", tomorrow).neq("mastery_state", "unseen").limit(50).execute()
        for card in (due.data or []):
            client.table("revision_queue").upsert({
                "user_id": user_id,
                "concept_id": card["concept_id"],
                "scheduled_date": tomorrow,
                "priority_score": max(0, (1 - (card.get("mastery_score") or 0)) * 100),
                "is_completed": False,
            }).execute()

    logger.info("Nightly scheduler completed", extra={"users_processed": len(users.data or [])})
