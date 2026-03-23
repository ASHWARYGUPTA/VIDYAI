import uuid
import logging
from datetime import datetime
from typing import Any

from ..utils.supabase_client import get_supabase_service_client, ms

logger = logging.getLogger(__name__)


async def fetch_questions(
    exam_type: Any,
    subject_id: uuid.UUID | None,
    chapter_id: uuid.UUID | None,
    count: int,
    mode: str,
    pyq_year_range: tuple | None,
    difficulty: Any | None,
    user_id: uuid.UUID,
) -> list[dict]:
    client = get_supabase_service_client()
    query = client.table("questions").select("*").eq("exam_type", exam_type.value if hasattr(exam_type, "value") else exam_type).eq("verified", True)

    if subject_id:
        query = query.eq("subject_id", str(subject_id))
    if chapter_id:
        query = query.eq("chapter_id", str(chapter_id))
    if mode == "pyq":
        query = query.eq("is_pyq", True)
        if pyq_year_range:
            query = query.gte("exam_year", pyq_year_range[0]).lte("exam_year", pyq_year_range[1])
    if difficulty:
        query = query.eq("difficulty_level", difficulty.value if hasattr(difficulty, "value") else difficulty)
    if mode == "adaptive":
        # Prioritize weak concepts for adaptive mode
        weak = client.table("learner_concept_states").select("concept_id").eq("user_id", str(user_id)).in_("mastery_state", ["learning", "forgotten"]).limit(20).execute()
        weak_ids = [r["concept_id"] for r in (weak.data or [])]
        if weak_ids:
            query = query.overlaps("concept_ids", weak_ids)

    result = query.limit(count).execute()
    return result.data or []


async def grade_test(user_id: uuid.UUID, test_session_id: uuid.UUID) -> dict[str, Any]:
    client = get_supabase_service_client()

    session = ms(client.table("test_sessions").select("*").eq("id", str(test_session_id)).eq("user_id", str(user_id)))
    if not session.data or session.data.get("submitted_at"):
        return {}

    question_ids = session.data.get("question_ids", [])

    # Use inline questions from metadata when available (e.g. quick JEE test)
    metadata = session.data.get("metadata") or {}
    inline = metadata.get("inline_questions")

    # Build answer map — inline tests store answers in metadata.answers to avoid FK constraints
    if inline:
        raw_answers = metadata.get("answers") or {}
        # Normalize to same shape as test_answers rows
        answer_map = {
            qid: {"question_id": qid, "selected_option": v["selected_option"], "time_spent_ms": v.get("time_spent_ms")}
            for qid, v in raw_answers.items()
        }
    else:
        answers = client.table("test_answers").select("*").eq("test_session_id", str(test_session_id)).execute()
        answer_map = {a["question_id"]: a for a in (answers.data or [])}
    if inline:
        questions_list = inline  # already have correct_option
    elif question_ids:
        q_result = client.table("questions").select(
            "id, correct_option, explanation, explanation_hindi, concept_ids, marks_positive, marks_negative"
        ).in_("id", question_ids).execute()
        questions_list = q_result.data or []
    else:
        questions_list = []

    total_score = 0.0
    max_score = 0.0
    results = []

    for q in questions_list:
        answer = answer_map.get(q["id"])
        selected = answer["selected_option"] if answer else "skipped"
        is_correct = selected == q["correct_option"]
        marks_pos = float(q.get("marks_positive") or 4)
        marks_neg = float(q.get("marks_negative") or 1)
        max_score += marks_pos

        if selected == "skipped":
            marks = 0.0
        elif is_correct:
            marks = marks_pos
        else:
            marks = -marks_neg

        total_score += marks

        # Update answer row with correctness (only for DB-backed answers, not inline)
        if answer and not inline and answer.get("id"):
            client.table("test_answers").update({"is_correct": is_correct, "marks_awarded": marks}).eq("id", answer["id"]).execute()

        results.append({
            "question_id": q["id"],
            "correct_option": q["correct_option"],
            "selected_option": selected,
            "is_correct": is_correct,
            "marks_awarded": marks,
            "explanation": q.get("explanation"),
        })

    accuracy = round(total_score / max_score * 100, 1) if max_score > 0 else 0
    xp = max(0, int(total_score * 2))

    client.table("test_sessions").update({
        "submitted_at": datetime.utcnow().isoformat(),
        "score": total_score,
        "max_score": max_score,
    }).eq("id", str(test_session_id)).execute()

    return {
        "score": total_score,
        "max_score": max_score,
        "accuracy": accuracy,
        "percentile": None,
        "time_taken_minutes": None,
        "results": results,
        "concept_performance": [],
        "xp_earned": xp,
        "knowledge_graph_updates": [],
    }
