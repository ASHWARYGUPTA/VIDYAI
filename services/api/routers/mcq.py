import uuid
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Query, status

from ..dependencies import CurrentUserID
from ..models.schemas import StartTestRequest, AnswerRequest, SubmitTestRequest
from ..services.mcq_service import fetch_questions, grade_test
from ..utils.supabase_client import get_supabase_service_client, ms

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/start")
async def start_test(body: StartTestRequest, user_id: CurrentUserID):
    client = get_supabase_service_client()

    questions = await fetch_questions(
        exam_type=body.exam_type,
        subject_id=body.subject_id,
        chapter_id=body.chapter_id,
        count=body.question_count,
        mode=body.mode,
        pyq_year_range=body.pyq_year_range,
        difficulty=body.difficulty,
        user_id=user_id,
    )
    if not questions:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": "not_found", "code": "NO_QUESTIONS"})

    sess = client.table("study_sessions").insert({
        "user_id": str(user_id),
        "session_type": "test",
    }).execute()
    study_session_id = sess.data[0]["id"]

    started_at = datetime.utcnow()
    expires_at = started_at + timedelta(minutes=body.duration_minutes)

    test_sess = client.table("test_sessions").insert({
        "user_id": str(user_id),
        "session_id": study_session_id,
        "exam_type": body.exam_type.value,
        "subject_id": str(body.subject_id) if body.subject_id else None,
        "chapter_id": str(body.chapter_id) if body.chapter_id else None,
        "question_ids": [str(q["id"]) for q in questions],
        "total_questions": len(questions),
        "duration_minutes": body.duration_minutes,
        "started_at": started_at.isoformat(),
        "is_adaptive": body.mode == "adaptive",
    }).execute()

    # Strip correct_option before returning
    safe_questions = [{k: v for k, v in q.items() if k != "correct_option"} for q in questions]

    return {
        "test_session_id": test_sess.data[0]["id"],
        "questions": safe_questions,
        "started_at": started_at.isoformat(),
        "expires_at": expires_at.isoformat(),
    }


@router.post("/answer")
async def submit_answer(body: AnswerRequest, user_id: CurrentUserID):
    client = get_supabase_service_client()

    session = ms(client.table("test_sessions").select("id, submitted_at").eq("id", str(body.test_session_id)).eq("user_id", str(user_id)))
    if not session.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": "not_found", "code": "SESSION_NOT_FOUND"})
    if session.data.get("submitted_at"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"error": "test_already_submitted", "code": "ALREADY_SUBMITTED"})

    client.table("test_answers").upsert({
        "test_session_id": str(body.test_session_id),
        "question_id": str(body.question_id),
        "user_id": str(user_id),
        "selected_option": body.selected_option,
        "time_spent_ms": body.time_spent_ms,
    }).execute()
    return {"saved": True}


@router.post("/submit")
async def submit_test(body: SubmitTestRequest, user_id: CurrentUserID):
    result = await grade_test(user_id=user_id, test_session_id=body.test_session_id)
    return result


@router.get("/sessions")
async def get_sessions(
    user_id: CurrentUserID,
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0, ge=0),
    exam_type: str | None = Query(default=None),
    subject_id: uuid.UUID | None = Query(default=None),
):
    client = get_supabase_service_client()
    query = (
        client.table("test_sessions")
        .select("id, exam_type, started_at, submitted_at, score, max_score, total_questions, is_adaptive", count="exact")
        .eq("user_id", str(user_id))
        .order("started_at", desc=True)
        .range(offset, offset + limit - 1)
    )
    if exam_type:
        query = query.eq("exam_type", exam_type)
    if subject_id:
        query = query.eq("subject_id", str(subject_id))
    result = query.execute()
    return {"sessions": result.data, "total": result.count}


@router.get("/session/{session_id}")
async def get_session(session_id: uuid.UUID, user_id: CurrentUserID):
    client = get_supabase_service_client()
    session = ms(client.table("test_sessions").select("*").eq("id", str(session_id)).eq("user_id", str(user_id)))
    if not session.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": "not_found", "code": "SESSION_NOT_FOUND"})

    answers = client.table("test_answers").select("*").eq("test_session_id", str(session_id)).execute()
    question_ids = session.data.get("question_ids", [])
    questions = client.table("questions").select("*").in_("id", question_ids).execute()

    return {"session": session.data, "answers": answers.data, "questions": questions.data}


@router.get("/questions")
async def browse_questions(
    user_id: CurrentUserID,
    subject_id: uuid.UUID | None = Query(default=None),
    chapter_id: uuid.UUID | None = Query(default=None),
    exam_type: str | None = Query(default=None),
    is_pyq: bool | None = Query(default=None),
    difficulty: str | None = Query(default=None),
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0, ge=0),
):
    client = get_supabase_service_client()
    query = client.table("questions").select("id, question_text, option_a, option_b, option_c, option_d, difficulty_level, exam_type, is_pyq, exam_year", count="exact").range(offset, offset + limit - 1)
    if subject_id:
        query = query.eq("subject_id", str(subject_id))
    if chapter_id:
        query = query.eq("chapter_id", str(chapter_id))
    if exam_type:
        query = query.eq("exam_type", exam_type)
    if is_pyq is not None:
        query = query.eq("is_pyq", is_pyq)
    if difficulty:
        query = query.eq("difficulty_level", difficulty)
    result = query.execute()
    return {"questions": result.data, "total": result.count}


@router.get("/analytics")
async def get_analytics(user_id: CurrentUserID):
    client = get_supabase_service_client()
    sessions = client.table("test_sessions").select("score, max_score, exam_type, subject_id, started_at").eq("user_id", str(user_id)).not_.is_("submitted_at", "null").execute()
    data = sessions.data or []
    if not data:
        return {"overall_accuracy": 0, "subject_accuracy": [], "time_trends": [], "weak_chapters": [], "strong_chapters": []}

    total_score = sum(s["score"] or 0 for s in data)
    total_max = sum(s["max_score"] or 0 for s in data)
    overall = round(total_score / total_max * 100, 1) if total_max else 0
    return {"overall_accuracy": overall, "subject_accuracy": [], "time_trends": [], "weak_chapters": [], "strong_chapters": []}
