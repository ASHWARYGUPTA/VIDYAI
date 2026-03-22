import uuid
import logging
from fastapi import APIRouter, Query
from ..dependencies import CurrentUserID
from ..utils.supabase_client import get_supabase_service_client, ms
from datetime import date, timedelta

logger = logging.getLogger(__name__)
router = APIRouter()

# XP thresholds per level (level = index + 1)
XP_LEVELS = [0, 500, 1200, 2500, 4500, 7500, 12000, 18000, 27000, 40000, 60000]


def _xp_to_level(total_xp: int) -> tuple[int, int]:
    """Returns (level, xp_needed_for_next_level)."""
    level = 1
    for i, threshold in enumerate(XP_LEVELS):
        if total_xp >= threshold:
            level = i + 1
        else:
            return level, threshold
    return len(XP_LEVELS), 0


@router.get("/dashboard")
async def get_dashboard(user_id: CurrentUserID):
    client = get_supabase_service_client()
    today = date.today().isoformat()

    streak = ms(client.table("revision_streaks").select("*").eq("user_id", str(user_id)))
    today_plan = ms(client.table("daily_study_plans").select("*").eq("user_id", str(user_id)).eq("plan_date", today))
    due_count = client.table("revision_queue").select("id", count="exact").eq("user_id", str(user_id)).eq("is_completed", False).lte("scheduled_date", today).execute()
    lcs = client.table("learner_concept_states").select("mastery_state").eq("user_id", str(user_id)).execute()

    states = [r["mastery_state"] for r in (lcs.data or [])]
    knowledge_summary = {s: states.count(s) for s in ["mastered", "learning", "unseen", "forgotten"]}

    week_start = (date.today() - timedelta(days=date.today().weekday())).isoformat()
    heatmap = client.table("daily_activity_heatmap").select("xp_earned").eq("user_id", str(user_id)).gte("activity_date", week_start).execute()
    weekly_xp = sum(r.get("xp_earned", 0) for r in (heatmap.data or []))

    last_test = ms(client.table("test_sessions").select("score, max_score").eq("user_id", str(user_id)).not_.is_("submitted_at", "null").order("submitted_at", desc=True).limit(1))
    recent_score = None
    if last_test.data and last_test.data.get("max_score"):
        recent_score = round(last_test.data["score"] / last_test.data["max_score"] * 100, 1)

    return {
        "streak": streak.data,
        "today_plan": today_plan.data,
        "due_cards_count": due_count.count or 0,
        "knowledge_summary": knowledge_summary,
        "weekly_xp": weekly_xp,
        "recent_test_score": recent_score,
        "upcoming_revisions": [],
        "syllabus_coverage": [],
    }


@router.get("/heatmap")
async def get_heatmap(user_id: CurrentUserID, months: int = Query(default=6, le=12)):
    client = get_supabase_service_client()
    since = (date.today() - timedelta(days=months * 30)).isoformat()
    result = client.table("daily_activity_heatmap").select("*").eq("user_id", str(user_id)).gte("activity_date", since).order("activity_date").execute()
    return {"days": result.data}


@router.get("/weekly")
async def get_weekly(user_id: CurrentUserID, weeks: int = Query(default=8, le=52)):
    client = get_supabase_service_client()
    since = (date.today() - timedelta(weeks=weeks)).isoformat()
    result = client.table("weekly_performance_snapshots").select("*").eq("user_id", str(user_id)).gte("week_start", since).order("week_start").execute()
    return {"weeks": result.data}


@router.get("/subject/{subject_id}")
async def get_subject_progress(subject_id: uuid.UUID, user_id: CurrentUserID):
    client = get_supabase_service_client()

    subject = client.table("subjects").select("*").eq("id", str(subject_id)).single().execute()

    chapters = client.table("chapters").select("*").eq("subject_id", str(subject_id)).order("chapter_number").execute()
    chapter_ids = [c["id"] for c in (chapters.data or [])]

    chapter_progress = (
        client.table("learner_chapter_progress")
        .select("*")
        .eq("user_id", str(user_id))
        .in_("chapter_id", chapter_ids)
        .execute()
    ) if chapter_ids else type("R", (), {"data": []})()

    progress_map = {r["chapter_id"]: r for r in (chapter_progress.data or [])}
    chapters_with_progress = [
        {**c, "progress": progress_map.get(c["id"], {"completion_percent": 0, "concepts_mastered": 0, "concepts_seen": 0})}
        for c in (chapters.data or [])
    ]

    concept_states = (
        client.table("learner_concept_states")
        .select("mastery_state, mastery_score, concept_id")
        .eq("user_id", str(user_id))
        .execute()
    )
    states = [r["mastery_state"] for r in (concept_states.data or [])]
    mastery_distribution = {s: states.count(s) for s in ["mastered", "learning", "reviewing", "unseen", "forgotten"]}

    test_sessions = (
        client.table("test_sessions")
        .select("score, max_score, started_at")
        .eq("user_id", str(user_id))
        .eq("subject_id", str(subject_id))
        .not_.is_("submitted_at", "null")
        .execute()
    )
    sessions = test_sessions.data or []
    total_score = sum(s.get("score") or 0 for s in sessions)
    total_max = sum(s.get("max_score") or 0 for s in sessions)
    test_performance = {
        "sessions_count": len(sessions),
        "average_accuracy": round(total_score / total_max * 100, 1) if total_max else 0,
    }

    return {
        "subject": subject.data,
        "chapters": chapters_with_progress,
        "mastery_distribution": mastery_distribution,
        "test_performance": test_performance,
        "concept_map": concept_states.data or [],
    }


@router.get("/leaderboard")
async def get_leaderboard(
    user_id: CurrentUserID,
    exam_type: str = Query(...),
    period: str = Query(default="weekly", pattern="^(weekly|monthly)$"),
):
    client = get_supabase_service_client()
    days = 7 if period == "weekly" else 30
    since = (date.today() - timedelta(days=days)).isoformat()

    # Aggregate XP for all users in the same exam cohort
    all_xp = (
        client.table("daily_activity_heatmap")
        .select("user_id, xp_earned")
        .gte("activity_date", since)
        .execute()
    )

    # Get exam_target for each user from profiles
    profiles = client.table("profiles").select("id, exam_target").eq("exam_target", exam_type).execute()
    cohort_ids = {p["id"] for p in (profiles.data or [])}

    user_totals: dict[str, int] = {}
    for row in (all_xp.data or []):
        uid = row["user_id"]
        if uid in cohort_ids:
            user_totals[uid] = user_totals.get(uid, 0) + (row.get("xp_earned") or 0)

    sorted_users = sorted(user_totals.items(), key=lambda x: x[1], reverse=True)
    total_students = len(sorted_users)

    my_xp = user_totals.get(str(user_id), 0)
    rank = next((i + 1 for i, (uid, _) in enumerate(sorted_users) if uid == str(user_id)), total_students)
    percentile = round((1 - (rank - 1) / max(total_students, 1)) * 100, 1)

    top_10_ids = [uid for uid, _ in sorted_users[:10]]
    top_profiles = client.table("profiles").select("id, full_name, avatar_url").in_("id", top_10_ids).execute() if top_10_ids else type("R", (), {"data": []})()
    profile_map = {p["id"]: p for p in (top_profiles.data or [])}

    top_10 = [
        {
            "rank": i + 1,
            "user_id": uid,
            "full_name": profile_map.get(uid, {}).get("full_name", "Anonymous"),
            "avatar_url": profile_map.get(uid, {}).get("avatar_url"),
            "xp": xp,
        }
        for i, (uid, xp) in enumerate(sorted_users[:10])
    ]

    return {
        "rank": rank,
        "percentile": percentile,
        "total_students": total_students,
        "my_xp": my_xp,
        "top_10": top_10,
    }


@router.get("/xp")
async def get_xp(user_id: CurrentUserID):
    client = get_supabase_service_client()

    all_activity = (
        client.table("daily_activity_heatmap")
        .select("activity_date, xp_earned, study_minutes, cards_reviewed, questions_attempted")
        .eq("user_id", str(user_id))
        .order("activity_date", desc=True)
        .execute()
    )

    total_xp = sum(r.get("xp_earned") or 0 for r in (all_activity.data or []))
    level, next_level_xp = _xp_to_level(total_xp)

    ledger = [
        {
            "date": r["activity_date"],
            "xp_earned": r.get("xp_earned", 0),
            "study_minutes": r.get("study_minutes", 0),
            "cards_reviewed": r.get("cards_reviewed", 0),
            "questions_attempted": r.get("questions_attempted", 0),
        }
        for r in (all_activity.data or [])[:30]
    ]

    # Badges earned from milestones
    badges = _compute_badges(total_xp, level, all_activity.data or [])

    return {
        "total_xp": total_xp,
        "level": level,
        "next_level_xp": next_level_xp,
        "ledger": ledger,
        "badges": badges,
    }


def _compute_badges(total_xp: int, level: int, activity: list) -> list[dict]:
    badges = []
    if total_xp >= 500:
        badges.append({"id": "first_500xp", "name": "Rising Star", "description": "Earned 500 XP"})
    if level >= 5:
        badges.append({"id": "level_5", "name": "Dedicated Learner", "description": "Reached Level 5"})
    cards_total = sum(r.get("cards_reviewed") or 0 for r in activity)
    if cards_total >= 100:
        badges.append({"id": "100_cards", "name": "Flashcard Pro", "description": "Reviewed 100 cards"})
    if len(activity) >= 7:
        badges.append({"id": "week_streak", "name": "Week Warrior", "description": "Studied 7+ days"})
    return badges
