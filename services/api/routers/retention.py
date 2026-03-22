import uuid
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
        .select("*, concepts(name, subject_id, chapter_id, difficulty_level)")
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
    return {"concepts": data, "summary": summary}


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
