import uuid
import math
import logging
from datetime import date, timedelta
from typing import Any

from ..utils.supabase_client import get_supabase_service_client, ms

logger = logging.getLogger(__name__)

XP_PER_REVIEW = {5: 15, 4: 12, 3: 8, 2: 5, 1: 3, 0: 1}


async def get_todays_deck(user_id: uuid.UUID, limit: int, include_new: bool) -> dict:
    client = get_supabase_service_client()
    today = date.today().isoformat()

    due = (
        client.table("revision_queue")
        .select("concept_id, priority_score, concepts(name, subject_id, chapter_id, difficulty_level)")
        .eq("user_id", str(user_id))
        .eq("is_completed", False)
        .lte("scheduled_date", today)
        .order("priority_score", desc=True)
        .limit(limit)
        .execute()
    )

    # Enrich due cards with mastery_state from learner_concept_states
    if due.data:
        concept_ids = [row["concept_id"] for row in due.data]
        states_result = (
            client.table("learner_concept_states")
            .select("concept_id, mastery_state")
            .eq("user_id", str(user_id))
            .in_("concept_id", concept_ids)
            .execute()
        )
        state_map = {r["concept_id"]: r["mastery_state"] for r in (states_result.data or [])}
        for row in due.data:
            row["mastery_state"] = state_map.get(row["concept_id"], "reviewing")

    cards = due.data or []
    new_cards = 0

    if include_new and len(cards) < limit:
        new_count = min(5, limit - len(cards))
        new = (
            client.table("learner_concept_states")
            .select("concept_id, mastery_state, concepts(name, subject_id, chapter_id, difficulty_level)")
            .eq("user_id", str(user_id))
            .eq("mastery_state", "unseen")
            .limit(new_count)
            .execute()
        )
        cards.extend(new.data or [])
        new_cards = len(new.data or [])

    estimated_minutes = len(cards) * 2
    return {
        "cards": cards,
        "total_due": len(cards),
        "new_cards": new_cards,
        "estimated_minutes": estimated_minutes,
    }


async def compute_fsrs_update(
    user_id: uuid.UUID,
    concept_id: uuid.UUID,
    quality_score: int,
    response_time_ms: int,
    session_id: uuid.UUID | None,
    hint_used: bool,
) -> dict[str, Any]:
    client = get_supabase_service_client()

    state = ms(
        client.table("learner_concept_states")
        .select("*")
        .eq("user_id", str(user_id))
        .eq("concept_id", str(concept_id))
    )

    if not state.data:
        state_data = {
            "user_id": str(user_id),
            "concept_id": str(concept_id),
            "mastery_state": "unseen",
            "mastery_score": 0.0,
            "ease_factor": 2.5,
            "interval_days": 0,
            "repetition_count": 0,
            "stability": 1.0,
            "difficulty_fsrs": 0.3,
            "retrievability": 1.0,
        }
    else:
        state_data = state.data

    new_interval, new_ef, new_stability = _sm2_update(
        quality_score=quality_score,
        repetitions=state_data.get("repetition_count", 0),
        interval=state_data.get("interval_days", 0),
        ef=state_data.get("ease_factor", 2.5),
    )

    new_mastery_score = _quality_to_mastery(quality_score, state_data.get("mastery_score", 0.0))
    new_mastery_state = _score_to_state(new_mastery_score, quality_score)
    next_review = date.today() + timedelta(days=new_interval)
    xp = XP_PER_REVIEW.get(quality_score, 5)

    # Update learner_concept_states atomically
    update = {
        "user_id": str(user_id),
        "concept_id": str(concept_id),
        "mastery_state": new_mastery_state,
        "mastery_score": round(new_mastery_score, 3),
        "ease_factor": round(new_ef, 3),
        "interval_days": new_interval,
        "repetition_count": (state_data.get("repetition_count", 0) or 0) + 1,
        "next_review_date": next_review.isoformat(),
        "last_reviewed_at": "now()",
        "total_attempts": (state_data.get("total_attempts", 0) or 0) + 1,
        "correct_attempts": (state_data.get("correct_attempts", 0) or 0) + (1 if quality_score >= 3 else 0),
        "stability": round(new_stability, 4),
    }
    client.table("learner_concept_states").upsert(update).execute()

    # Update revision_queue
    client.table("revision_queue").update({"is_completed": True}).eq("user_id", str(user_id)).eq("concept_id", str(concept_id)).eq("is_completed", False).execute()

    # Insert next revision
    client.table("revision_queue").insert({
        "user_id": str(user_id),
        "concept_id": str(concept_id),
        "scheduled_date": next_review.isoformat(),
        "priority_score": _compute_priority(new_mastery_score, new_interval),
    }).execute()

    # Log interaction event
    client.table("concept_interaction_events").insert({
        "user_id": str(user_id),
        "session_id": str(session_id) if session_id else None,
        "concept_id": str(concept_id),
        "event_type": "revision",
        "quality_score": quality_score,
        "response_time_ms": response_time_ms,
        "was_correct": quality_score >= 3,
        "hint_used": hint_used,
    }).execute()

    # Update daily heatmap
    _update_heatmap(user_id, xp)

    return {
        "next_review_date": next_review,
        "new_interval_days": new_interval,
        "new_mastery_state": new_mastery_state,
        "new_mastery_score": new_mastery_score,
        "ease_factor": new_ef,
        "xp_earned": xp,
    }


def _sm2_update(quality_score: int, repetitions: int, interval: int, ef: float) -> tuple[int, float, float]:
    """SM-2 algorithm with FSRS stability estimate."""
    if quality_score < 3:
        return 1, max(1.3, ef - 0.2), 1.0

    new_ef = ef + (0.1 - (5 - quality_score) * (0.08 + (5 - quality_score) * 0.02))
    new_ef = max(1.3, new_ef)

    if repetitions == 0:
        new_interval = 1
    elif repetitions == 1:
        new_interval = 6
    else:
        new_interval = round(interval * new_ef)

    stability = new_interval * new_ef
    return new_interval, new_ef, stability


def _quality_to_mastery(quality: int, current: float) -> float:
    delta = {5: 0.15, 4: 0.10, 3: 0.05, 2: -0.05, 1: -0.10, 0: -0.20}.get(quality, 0)
    return max(0.0, min(1.0, current + delta))


def _score_to_state(score: float, quality: int) -> str:
    if quality == 0:
        return "forgotten"
    if score >= 0.8:
        return "mastered"
    if score >= 0.4:
        return "reviewing"
    return "learning"


def _compute_priority(mastery_score: float, interval_days: int) -> float:
    urgency = max(0, 1 - mastery_score)
    return round(urgency * 100 + (1 / max(1, interval_days)) * 10, 4)


def _update_heatmap(user_id: uuid.UUID, xp: int):
    client = get_supabase_service_client()
    today = date.today().isoformat()
    existing = ms(client.table("daily_activity_heatmap").select("*").eq("user_id", str(user_id)).eq("activity_date", today))
    if existing.data:
        client.table("daily_activity_heatmap").update({
            "cards_reviewed": (existing.data.get("cards_reviewed", 0) or 0) + 1,
            "xp_earned": (existing.data.get("xp_earned", 0) or 0) + xp,
        }).eq("user_id", str(user_id)).eq("activity_date", today).execute()
    else:
        client.table("daily_activity_heatmap").insert({
            "user_id": str(user_id),
            "activity_date": today,
            "cards_reviewed": 1,
            "xp_earned": xp,
        }).execute()
