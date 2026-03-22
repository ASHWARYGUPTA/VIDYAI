import uuid
import base64
import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel

from ..dependencies import CurrentUserID
from ..services.pdf_test_service import extract_mcqs_from_pdf, analyze_frame_for_faces
from ..utils.supabase_client import get_supabase_service_client

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Upload PDF & create test ──────────────────────────────────────────────────

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_pdf_test(
    user_id: CurrentUserID,
    file: UploadFile = File(...),
    title: str = Form(...),
    duration_minutes: int = Form(default=60),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail={"error": "pdf_required", "code": "INVALID_FILE"})

    pdf_bytes = await file.read()
    if len(pdf_bytes) > 20 * 1024 * 1024:  # 20 MB cap
        raise HTTPException(status_code=400, detail={"error": "file_too_large", "code": "FILE_TOO_LARGE"})

    questions = await extract_mcqs_from_pdf(pdf_bytes)
    if not questions:
        raise HTTPException(status_code=422, detail={"error": "no_questions_found", "code": "NO_MCQ"})

    client = get_supabase_service_client()

    # Insert questions into the shared questions table (exam_type = "CUSTOM")
    rows = [
        {
            "question_text": q["question_text"],
            "option_a": q["option_a"],
            "option_b": q["option_b"],
            "option_c": q["option_c"],
            "option_d": q["option_d"],
            "correct_option": q["correct_option"],
            "explanation": q.get("explanation", ""),
            "exam_type": "CUSTOM",
            "difficulty_level": "Medium",
            "verified": True,
            "created_by": str(user_id),
        }
        for q in questions
    ]
    inserted = client.table("questions").insert(rows).execute()
    q_ids = [r["id"] for r in inserted.data]

    # Create pdf_test record
    test = client.table("pdf_tests").insert({
        "created_by": str(user_id),
        "title": title,
        "source_filename": file.filename,
        "question_ids": q_ids,
        "total_questions": len(q_ids),
        "duration_minutes": duration_minutes,
    }).execute()

    return {
        "test_id": test.data[0]["id"],
        "title": title,
        "total_questions": len(q_ids),
        "duration_minutes": duration_minutes,
    }


# ── List tests created by this user ──────────────────────────────────────────

@router.get("/")
async def list_tests(user_id: CurrentUserID):
    client = get_supabase_service_client()
    result = (
        client.table("pdf_tests")
        .select("id, title, source_filename, total_questions, duration_minutes, created_at")
        .eq("created_by", str(user_id))
        .eq("is_active", True)
        .order("created_at", desc=True)
        .execute()
    )
    return {"tests": result.data}


# ── Start a test session from a pdf_test ─────────────────────────────────────

@router.post("/{test_id}/start")
async def start_pdf_test(test_id: uuid.UUID, user_id: CurrentUserID):
    client = get_supabase_service_client()

    pdf_test = client.table("pdf_tests").select("*").eq("id", str(test_id)).single().execute()
    if not pdf_test.data:
        raise HTTPException(status_code=404, detail={"error": "not_found", "code": "TEST_NOT_FOUND"})

    t = pdf_test.data
    q_ids = t["question_ids"] or []
    if not q_ids:
        raise HTTPException(status_code=404, detail={"error": "no_questions", "code": "EMPTY_TEST"})

    questions = client.table("questions").select(
        "id, question_text, option_a, option_b, option_c, option_d, difficulty_level"
    ).in_("id", q_ids).execute()

    sess = client.table("study_sessions").insert({
        "user_id": str(user_id),
        "session_type": "test",
    }).execute()

    started_at = datetime.utcnow()
    expires_at = started_at + timedelta(minutes=t["duration_minutes"])

    test_sess = client.table("test_sessions").insert({
        "user_id": str(user_id),
        "session_id": sess.data[0]["id"],
        "exam_type": "CUSTOM",
        "question_ids": q_ids,
        "total_questions": len(q_ids),
        "duration_minutes": t["duration_minutes"],
        "started_at": started_at.isoformat(),
        "is_adaptive": False,
        "metadata": {"pdf_test_id": str(test_id), "pdf_test_title": t["title"]},
    }).execute()

    return {
        "test_session_id": test_sess.data[0]["id"],
        "title": t["title"],
        "questions": questions.data,
        "started_at": started_at.isoformat(),
        "expires_at": expires_at.isoformat(),
        "duration_minutes": t["duration_minutes"],
    }


# ── Proctoring: analyze a webcam frame ────────────────────────────────────────

class ProctorFrameRequest(BaseModel):
    test_session_id: uuid.UUID
    frame_b64: str  # base64-encoded JPEG


@router.post("/proctor/analyze")
async def analyze_proctor_frame(body: ProctorFrameRequest, user_id: CurrentUserID):
    try:
        jpeg_bytes = base64.b64decode(body.frame_b64)
    except Exception:
        raise HTTPException(status_code=400, detail={"error": "invalid_frame"})

    result = analyze_frame_for_faces(jpeg_bytes)
    violations = result["violations"]

    # Persist violations
    if violations:
        client = get_supabase_service_client()
        rows = [
            {
                "test_session_id": str(body.test_session_id),
                "user_id": str(user_id),
                "event_type": v,
                "severity": "critical" if v == "multiple_faces" else "warning",
                "detail": {"face_count": result["face_count"]},
            }
            for v in violations
        ]
        client.table("proctor_events").insert(rows).execute()

    return {"violations": violations, "face_count": result["face_count"]}


# ── Log a browser-detected proctoring event ───────────────────────────────────

class ProctorEventRequest(BaseModel):
    test_session_id: uuid.UUID
    event_type: str   # tab_switch | fullscreen_exit | window_blur
    detail: dict = {}


@router.post("/proctor/event")
async def log_proctor_event(body: ProctorEventRequest, user_id: CurrentUserID):
    allowed = {"tab_switch", "fullscreen_exit", "window_blur"}
    if body.event_type not in allowed:
        raise HTTPException(status_code=400, detail={"error": "invalid_event_type"})

    client = get_supabase_service_client()
    client.table("proctor_events").insert({
        "test_session_id": str(body.test_session_id),
        "user_id": str(user_id),
        "event_type": body.event_type,
        "severity": "warning",
        "detail": body.detail,
    }).execute()
    return {"logged": True}


# ── Get proctoring report for a session ──────────────────────────────────────

@router.get("/proctor/report/{session_id}")
async def get_proctor_report(session_id: uuid.UUID, user_id: CurrentUserID):
    client = get_supabase_service_client()
    events = (
        client.table("proctor_events")
        .select("event_type, severity, detail, created_at")
        .eq("test_session_id", str(session_id))
        .eq("user_id", str(user_id))
        .order("created_at")
        .execute()
    )
    data = events.data or []
    summary = {}
    for e in data:
        summary[e["event_type"]] = summary.get(e["event_type"], 0) + 1

    return {"events": data, "summary": summary, "total_violations": len(data)}
