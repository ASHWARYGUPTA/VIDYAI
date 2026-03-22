import uuid
import logging
from datetime import date, timedelta
from typing import Any

from ..utils.supabase_client import get_supabase_service_client, ms

logger = logging.getLogger(__name__)


async def generate_initial_plan(user_id: uuid.UUID, exam_type: Any, exam_date: date | None, daily_hours: int) -> dict:
    return await generate_study_plan(user_id=user_id, exam_type=exam_type, exam_date=exam_date, daily_hours=daily_hours)


async def generate_study_plan(
    user_id: uuid.UUID,
    exam_type: Any,
    exam_date: date | None,
    daily_hours: int,
    excluded_dates: list[date] = [],
    priority_subjects: list = [],
    weak_subjects: list = [],
) -> dict[str, Any]:
    client = get_supabase_service_client()

    # Deactivate any current active plan
    client.table("study_plans").update({"status": "paused"}).eq("user_id", str(user_id)).eq("status", "active").execute()

    today = date.today()
    effective_exam_date = exam_date or (today + timedelta(weeks=52))
    total_weeks = max(1, (effective_exam_date - today).days // 7)

    plan_row = client.table("study_plans").insert({
        "user_id": str(user_id),
        "exam_type": exam_type.value if hasattr(exam_type, "value") else exam_type,
        "exam_date": effective_exam_date.isoformat(),
        "status": "active",
        "total_weeks": total_weeks,
        "current_week": 1,
        "weak_subjects": [s.value if hasattr(s, "value") else s for s in weak_subjects],
        "strong_subjects": [],
        "plan_config": {
            "daily_hours": daily_hours,
            "excluded_dates": [d.isoformat() for d in excluded_dates],
            "priority_subjects": [s.value if hasattr(s, "value") else s for s in priority_subjects],
        },
    }).execute()

    plan = plan_row.data[0]

    # Generate today's plan using LLM
    today_plan = await _generate_daily_plan(user_id=user_id, plan_id=uuid.UUID(plan["id"]), plan_date=today, daily_hours=daily_hours, exam_type=exam_type)

    return {"id": plan["id"], "plan": plan, "today": today_plan}


async def rebalance_plan(user_id: uuid.UUID, reason: str | None) -> dict:
    client = get_supabase_service_client()
    active = ms(client.table("study_plans").select("*").eq("user_id", str(user_id)).eq("status", "active").order("created_at", desc=True).limit(1))
    if not active.data:
        return {"plan": None, "changes": [], "new_today": None}

    plan = active.data
    client.table("study_plans").update({"rebalance_reason": reason, "last_rebalanced_at": "now()"}).eq("id", plan["id"]).execute()

    today = date.today()
    today_plan = await _generate_daily_plan(
        user_id=user_id,
        plan_id=uuid.UUID(plan["id"]),
        plan_date=today,
        daily_hours=plan.get("plan_config", {}).get("daily_hours", 6),
        exam_type=plan["exam_type"],
    )
    return {"plan": plan, "changes": [], "new_today": today_plan}


async def _generate_daily_plan(
    user_id: uuid.UUID,
    plan_id: uuid.UUID,
    plan_date: date,
    daily_hours: int,
    exam_type: Any,
) -> dict:
    """Generate daily slots. Uses Gemini if available, else fallback."""
    client = get_supabase_service_client()

    slots = await _llm_generate_slots(user_id, exam_type, daily_hours)

    result = client.table("daily_study_plans").upsert({
        "plan_id": str(plan_id),
        "user_id": str(user_id),
        "plan_date": plan_date.isoformat(),
        "total_hours": daily_hours,
        "slots": slots,
        "is_completed": False,
        "completion_percent": 0,
    }).execute()

    return result.data[0] if result.data else {}


async def _llm_generate_slots(user_id: uuid.UUID, exam_type: Any, daily_hours: int) -> list:
    """Generate study slots via OpenRouter. Degrades to default schedule if LLM unavailable."""
    try:
        import json
        if settings.openrouter_api_key:
            os.environ["OPENROUTER_API_KEY"] = settings.openrouter_api_key

        client_db = get_supabase_service_client()

        # Get weak concepts to prioritize
        weak = client_db.table("learner_concept_states").select("concept_id, mastery_score, concepts(name, subject_id)").eq("user_id", str(user_id)).in_("mastery_state", ["learning", "forgotten"]).order("mastery_score").limit(10).execute()
        weak_summary = [f"{r['concepts']['name']} (score: {r['mastery_score']})" for r in (weak.data or []) if r.get("concepts")] if weak.data else []

        system = """You are a study planner for Indian competitive exam students.
Generate a JSON array of study slots for today. Each slot:
{"subject": string, "chapter_id": null, "concept_ids": [], "duration_minutes": integer, "type": "new"|"revision"|"test"}
Return ONLY valid JSON array, no other text."""

        human = f"Exam: {exam_type}, Hours available: {daily_hours}, Weak areas: {', '.join(weak_summary[:5]) or 'none yet'}"

        from ..utils.llm import get_llm
        from langchain_core.messages import SystemMessage, HumanMessage
        llm = get_llm(temperature=0.2)
        response = await llm.ainvoke([
            SystemMessage(content=system),
            HumanMessage(content=human),
        ])

        raw = response.content or ""
        if "```" in raw:
            raw = raw[raw.find("["):raw.rfind("]") + 1]
        logger.info("Planner LLM call", extra={"model": "openrouter/google/gemma-3-4b-it:free", "tokens_used": 0, "latency_ms": 0, "endpoint": "planner/generate", "user_id": str(user_id)})
        return json.loads(raw)

    except Exception as e:
        logger.warning("Planner LLM failed — using fallback slots", extra={"error": str(e)})
        slot_minutes = (daily_hours * 60) // 3
        return [
            {"subject": "Physics", "chapter_id": None, "concept_ids": [], "duration_minutes": slot_minutes, "type": "new"},
            {"subject": "Chemistry", "chapter_id": None, "concept_ids": [], "duration_minutes": slot_minutes, "type": "revision"},
            {"subject": "Mathematics", "chapter_id": None, "concept_ids": [], "duration_minutes": slot_minutes, "type": "new"},
        ]
