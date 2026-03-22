import uuid
import logging
from fastapi import APIRouter, HTTPException, Query, Path, status

from ..dependencies import CurrentUserID
from ..models.schemas import GeneratePlanRequest, SlotUpdateRequest, RebalanceRequest, PlanConfigRequest
from ..services.planner_service import generate_study_plan, rebalance_plan
from ..utils.supabase_client import get_supabase_service_client, ms
from datetime import date, timedelta

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/generate")
async def generate_plan(body: GeneratePlanRequest, user_id: CurrentUserID):
    from ..models.schemas import ExamType as ExamTypeEnum
    from datetime import datetime

    # If required fields not provided, pull from user profile
    exam_type = body.exam_type
    exam_date = body.exam_date
    daily_hours = body.daily_hours

    if exam_type is None or daily_hours is None:
        client = get_supabase_service_client()
        profile = client.table("profiles").select(
            "exam_target, exam_date, daily_study_hours"
        ).eq("id", str(user_id)).single().execute()
        if profile.data:
            if exam_type is None:
                raw = profile.data.get("exam_target", "JEE")
                exam_type = ExamTypeEnum(raw)
            if exam_date is None and profile.data.get("exam_date"):
                exam_date = datetime.fromisoformat(profile.data["exam_date"]).date()
            if daily_hours is None:
                daily_hours = profile.data.get("daily_study_hours", 4)

    if exam_type is None:
        exam_type = ExamTypeEnum.JEE
    if daily_hours is None:
        daily_hours = 4

    plan = await generate_study_plan(
        user_id=user_id,
        exam_type=exam_type,
        exam_date=exam_date,
        daily_hours=daily_hours,
        excluded_dates=body.excluded_dates,
        priority_subjects=body.priority_subjects,
        weak_subjects=body.weak_subjects,
    )
    return plan


@router.get("/today")
async def get_today_plan(user_id: CurrentUserID):
    client = get_supabase_service_client()
    today = date.today().isoformat()
    result = ms(
        client.table("daily_study_plans")
        .select("*")
        .eq("user_id", str(user_id))
        .eq("plan_date", today)
    )
    if not result.data:
        return {"plan": None, "completion_percent": 0, "rebalance_alerts": [], "was_auto_rebalanced": False}

    # Detect retention dips: compare last 2 weekly_performance_snapshots
    rebalance_alerts = []
    was_auto_rebalanced = False
    try:
        snapshots = (
            client.table("weekly_performance_snapshots")
            .select("week_start, subject_scores")
            .eq("user_id", str(user_id))
            .order("week_start", desc=True)
            .limit(2)
            .execute()
        )
        snaps = snapshots.data or []
        if len(snaps) >= 2:
            this_week = snaps[0].get("subject_scores") or {}
            last_week = snaps[1].get("subject_scores") or {}
            for subject, curr_score in this_week.items():
                prev_score = last_week.get(subject)
                if prev_score and prev_score > 0:
                    dip_pct = round((prev_score - curr_score) / prev_score * 100, 1)
                    if dip_pct >= 10:
                        rebalance_alerts.append({
                            "subject": subject,
                            "current_retention": round(curr_score, 1),
                            "prev_retention": round(prev_score, 1),
                            "dip_pct": dip_pct,
                        })

        # Auto-rebalance if significant dips and plan hasn't been rebalanced recently
        if rebalance_alerts:
            active_plan = (
                client.table("study_plans")
                .select("id, last_rebalanced_at")
                .eq("user_id", str(user_id))
                .eq("status", "active")
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            if active_plan.data:
                plan_row = active_plan.data[0]
                last_rebalanced = plan_row.get("last_rebalanced_at")
                should_rebalance = True
                if last_rebalanced:
                    try:
                        last_date = date.fromisoformat(last_rebalanced[:10])
                        should_rebalance = (date.today() - last_date).days >= 7
                    except (ValueError, TypeError):
                        pass
                if should_rebalance:
                    await rebalance_plan(user_id=user_id, reason="auto_retention_dip")
                    was_auto_rebalanced = True
                    # Refresh plan after rebalance
                    result = ms(
                        client.table("daily_study_plans")
                        .select("*")
                        .eq("user_id", str(user_id))
                        .eq("plan_date", today)
                    )
    except Exception as e:
        logger.warning("Rebalance detection failed: %s", e)

    return {
        "plan": result.data,
        "completion_percent": result.data.get("completion_percent", 0),
        "rebalance_alerts": rebalance_alerts,
        "was_auto_rebalanced": was_auto_rebalanced,
    }


@router.get("/week")
async def get_week_plan(user_id: CurrentUserID, week_offset: int = Query(default=0)):
    client = get_supabase_service_client()
    today = date.today()
    week_start = today - timedelta(days=today.weekday()) + timedelta(weeks=week_offset)
    week_end = week_start + timedelta(days=6)

    result = (
        client.table("daily_study_plans")
        .select("*")
        .eq("user_id", str(user_id))
        .gte("plan_date", week_start.isoformat())
        .lte("plan_date", week_end.isoformat())
        .order("plan_date")
        .execute()
    )

    days = result.data or []
    total = len(days)
    completed = sum(1 for d in days if d.get("is_completed"))
    return {
        "days": days,
        "week_stats": {
            "week_start": week_start.isoformat(),
            "total_days": total,
            "completed_days": completed,
            "completion_rate": round(completed / total * 100, 1) if total else 0,
        },
    }


@router.patch("/today/slot/{slot_index}")
async def update_slot(
    slot_index: int = Path(..., ge=0),
    body: SlotUpdateRequest = ...,
    user_id: CurrentUserID = ...,
):
    client = get_supabase_service_client()
    today = date.today().isoformat()
    plan_row = ms(client.table("daily_study_plans").select("*").eq("user_id", str(user_id)).eq("plan_date", today))
    if not plan_row.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": "not_found", "code": "NO_PLAN_TODAY"})

    slots = plan_row.data.get("slots", [])
    if slot_index >= len(slots):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"error": "invalid_slot", "code": "SLOT_OUT_OF_RANGE"})

    slots[slot_index]["status"] = body.status
    if body.actual_minutes:
        slots[slot_index]["actual_minutes"] = body.actual_minutes

    completed_slots = sum(1 for s in slots if s.get("status") == "completed")
    completion_percent = round(completed_slots / len(slots) * 100, 1) if slots else 0
    xp = 20 if body.status == "completed" else 0

    client.table("daily_study_plans").update({
        "slots": slots,
        "completion_percent": completion_percent,
        "is_completed": completion_percent == 100,
    }).eq("user_id", str(user_id)).eq("plan_date", today).execute()

    return {"plan": {**plan_row.data, "slots": slots, "completion_percent": completion_percent}, "xp_earned": xp}


@router.post("/rebalance")
async def rebalance(body: RebalanceRequest, user_id: CurrentUserID):
    result = await rebalance_plan(user_id=user_id, reason=body.reason)
    return result


@router.patch("/config")
async def update_config(body: PlanConfigRequest, user_id: CurrentUserID):
    client = get_supabase_service_client()
    active_plan = (
        client.table("study_plans")
        .select("*")
        .eq("user_id", str(user_id))
        .eq("status", "active")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not active_plan.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": "not_found", "code": "NO_ACTIVE_PLAN"})

    plan = active_plan.data[0]
    config = plan.get("plan_config", {})
    updates: dict = {}

    if body.daily_hours is not None:
        updates["plan_config"] = {**config, "daily_hours": body.daily_hours}
    if body.excluded_dates is not None:
        updates["plan_config"] = {**config, "excluded_dates": [d.isoformat() for d in body.excluded_dates]}
    if body.priority_subjects is not None:
        updates["plan_config"] = {**config, "priority_subjects": [s.value for s in body.priority_subjects]}

    if updates:
        result = client.table("study_plans").update(updates).eq("id", plan["id"]).execute()
        return {"plan": result.data[0]}
    return {"plan": plan}


@router.get("/history")
async def get_history(
    user_id: CurrentUserID,
    limit: int = Query(default=30, le=100),
    offset: int = Query(default=0, ge=0),
):
    client = get_supabase_service_client()
    result = (
        client.table("daily_study_plans")
        .select("*", count="exact")
        .eq("user_id", str(user_id))
        .order("plan_date", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    plans = result.data or []
    total = result.count or 0
    completed = sum(1 for p in plans if p.get("is_completed"))
    completion_rate = round(completed / len(plans) * 100, 1) if plans else 0
    return {"plans": plans, "completion_rate": completion_rate}
