import uuid
import math
import logging
from datetime import date, timedelta
from fastapi import APIRouter, HTTPException, Query, status

from ..dependencies import CurrentUserID
from ..models.schemas import ReviewRequest, ReviewResponse, BatchReviewRequest, FreezeResponse
from ..services.retention_service import compute_fsrs_update, get_todays_deck
from ..utils.supabase_client import get_supabase_service_client, ms

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/deck/today")
async def get_today_deck(
    user_id: CurrentUserID,
    limit: int = Query(default=30, le=100),
    include_new: bool = Query(default=True),
):
    result = await get_todays_deck(user_id=user_id, limit=limit, include_new=include_new)
    return result


@router.post("/review", response_model=ReviewResponse)
async def submit_review(body: ReviewRequest, user_id: CurrentUserID):
    result = await compute_fsrs_update(
        user_id=user_id,
        concept_id=body.concept_id,
        quality_score=body.quality_score,
        response_time_ms=body.response_time_ms,
        session_id=body.session_id,
        hint_used=body.hint_used,
    )
    return result


@router.post("/review/batch")
async def batch_review(body: BatchReviewRequest, user_id: CurrentUserID):
    total_xp = 0
    for review in body.reviews:
        r = await compute_fsrs_update(
            user_id=user_id,
            concept_id=review.concept_id,
            quality_score=review.quality_score,
            response_time_ms=review.response_time_ms,
            session_id=body.session_id,
            hint_used=review.hint_used,
        )
        total_xp += r["xp_earned"]

    client = get_supabase_service_client()
    streak = ms(client.table("revision_streaks").select("*").eq("user_id", str(user_id)))
    return {"updated": len(body.reviews), "xp_earned": total_xp, "streak": streak.data}


@router.get("/knowledge-graph")
async def get_knowledge_graph(
    user_id: CurrentUserID,
    subject_id: uuid.UUID | None = Query(default=None),
    mastery_state: str | None = Query(default=None),
):
    client = get_supabase_service_client()
    query = (
        client.table("learner_concept_states")
        .select("*, concepts(name, subject_id, chapter_id, difficulty_level, subjects(name))")
        .eq("user_id", str(user_id))
    )
    if subject_id:
        query = query.eq("concepts.subject_id", str(subject_id))
    if mastery_state and mastery_state != "all":
        query = query.eq("mastery_state", mastery_state)

    result = query.execute()
    data = result.data or []
    summary = {
        "mastered": sum(1 for c in data if c["mastery_state"] == "mastered"),
        "learning": sum(1 for c in data if c["mastery_state"] == "learning"),
        "unseen": sum(1 for c in data if c["mastery_state"] == "unseen"),
        "forgotten": sum(1 for c in data if c["mastery_state"] == "forgotten"),
    }

    # Compute per-subject retention index (avg mastery_score × 100, 0-100)
    subject_scores: dict[str, list[float]] = {}
    subject_names: dict[str, str] = {}
    for c in data:
        concept = c.get("concepts") or {}
        sid = concept.get("subject_id")
        if not sid:
            continue
        sname = (concept.get("subjects") or {}).get("name", sid)
        subject_names[sid] = sname
        subject_scores.setdefault(sid, []).append(float(c.get("mastery_score") or 0))

    subject_retention_index = [
        {
            "subject_id": sid,
            "subject_name": subject_names[sid],
            "retention_index": round(sum(scores) / len(scores) * 100, 1),
            "concept_count": len(scores),
        }
        for sid, scores in subject_scores.items()
    ]

    return {"concepts": data, "summary": summary, "subject_retention_index": subject_retention_index}


@router.get("/forgetting-curve")
async def get_forgetting_curve(
    user_id: CurrentUserID,
    days: int = Query(default=30, le=90),
    concept_id: uuid.UUID | None = Query(default=None),
):
    """
    Returns a time-series of estimated average retention (0-100) over the past N days,
    using Ebbinghaus decay: R(t) = e^(-t/S) between reviews, where S is FSRS stability.
    Also returns the earliest upcoming review date.
    """
    client = get_supabase_service_client()
    since = (date.today() - timedelta(days=days)).isoformat()

    # Fetch all active concept states for this user (with stability)
    states_query = (
        client.table("learner_concept_states")
        .select("concept_id, mastery_score, stability, last_reviewed_at, next_review_date")
        .eq("user_id", str(user_id))
        .neq("mastery_state", "unseen")
    )
    if concept_id:
        states_query = states_query.eq("concept_id", str(concept_id))
    states_result = states_query.execute()
    states = states_result.data or []

    if not states:
        return {"curve": [], "next_review_due": None, "current_avg_retention": 0}

    # Build daily retention estimates for each day in the range
    today = date.today()
    curve = []
    for day_offset in range(days + 1):
        target_date = today - timedelta(days=days - day_offset)
        target_iso = target_date.isoformat()

        daily_retentions = []
        for s in states:
            last_reviewed = s.get("last_reviewed_at")
            stability = float(s.get("stability") or 1.0)
            if not last_reviewed:
                continue
            # Days since last review relative to target_date
            try:
                last_date = date.fromisoformat(last_reviewed[:10])
            except (ValueError, TypeError):
                continue
            t = (target_date - last_date).days
            if t < 0:
                # Not yet reviewed at this point in time
                continue
            # Ebbinghaus: R(t) = e^(-t/S), clamped to [0,1]
            r = math.exp(-t / max(stability, 0.1))
            daily_retentions.append(r)

        avg_retention = round(sum(daily_retentions) / len(daily_retentions) * 100, 1) if daily_retentions else None
        curve.append({"date": target_iso, "avg_retention": avg_retention})

    # Earliest next review date
    next_due_dates = [s["next_review_date"] for s in states if s.get("next_review_date")]
    next_review_due = min(next_due_dates) if next_due_dates else None

    # Current retention (today)
    current_retentions = []
    for s in states:
        last_reviewed = s.get("last_reviewed_at")
        stability = float(s.get("stability") or 1.0)
        if not last_reviewed:
            continue
        try:
            last_date = date.fromisoformat(last_reviewed[:10])
        except (ValueError, TypeError):
            continue
        t = (today - last_date).days
        r = math.exp(-t / max(stability, 0.1))
        current_retentions.append(r)
    current_avg = round(sum(current_retentions) / len(current_retentions) * 100, 1) if current_retentions else 0

    return {
        "curve": curve,
        "next_review_due": next_review_due,
        "current_avg_retention": current_avg,
    }


@router.get("/weak-areas")
async def get_weak_areas(
    user_id: CurrentUserID,
    limit: int = Query(default=10, le=50),
    subject_id: uuid.UUID | None = Query(default=None),
):
    client = get_supabase_service_client()
    query = (
        client.table("learner_concept_states")
        .select("*, concepts(name, chapter_id, subject_id, difficulty_level, chapters(name))")
        .eq("user_id", str(user_id))
        .in_("mastery_state", ["learning", "forgotten"])
        .order("mastery_score", desc=False)
        .limit(limit)
    )
    if subject_id:
        query = query.eq("concepts.subject_id", str(subject_id))
    result = query.execute()
    return {"weak_concepts": result.data, "by_chapter": []}


@router.get("/streak")
async def get_streak(user_id: CurrentUserID):
    client = get_supabase_service_client()
    result = ms(client.table("revision_streaks").select("*").eq("user_id", str(user_id)))
    return {"streak": result.data}


@router.post("/streak/freeze", response_model=FreezeResponse)
async def freeze_streak(user_id: CurrentUserID):
    client = get_supabase_service_client()
    streak = ms(client.table("revision_streaks").select("*").eq("user_id", str(user_id)))
    if not streak.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": "not_found", "code": "STREAK_NOT_FOUND"})
    if streak.data["freeze_tokens_remaining"] <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"error": "no_freeze_tokens", "code": "FREEZE_EXHAUSTED"})

    remaining = streak.data["freeze_tokens_remaining"] - 1
    client.table("revision_streaks").update({
        "freeze_tokens_remaining": remaining,
        "last_revision_date": date.today().isoformat(),
    }).eq("user_id", str(user_id)).execute()
    return {"tokens_remaining": remaining, "streak_protected": True}


@router.get("/schedule")
async def get_schedule(user_id: CurrentUserID, days: int = Query(default=7, le=30)):
    client = get_supabase_service_client()
    today = date.today()
    end = today + timedelta(days=days)

    result = (
        client.table("revision_queue")
        .select("scheduled_date, concept_id")
        .eq("user_id", str(user_id))
        .eq("is_completed", False)
        .gte("scheduled_date", today.isoformat())
        .lte("scheduled_date", end.isoformat())
        .execute()
    )

    by_date: dict[str, list] = {}
    for row in (result.data or []):
        d = row["scheduled_date"]
        by_date.setdefault(d, []).append(row["concept_id"])

    schedule = [{"date": d, "due_count": len(ids), "concepts": ids} for d, ids in sorted(by_date.items())]
    return {"schedule": schedule}
