"""
Router 10 — MCP Server /mcp
FastMCP server exposing VidyAI's 5 features as MCP tools/resources/prompts.
Auth: Bearer <partner_api_key>  (validated via dependencies_partner)
Protocol: JSON-RPC 2.0 over HTTP + SSE
Usage is metered per tool call via partner_api_usage table.
"""
import uuid
import time
import logging
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Request, HTTPException, status

from fastmcp import FastMCP

from ..dependencies_partner import _hash_key
from ..utils.supabase_client import get_supabase_service_client
from ..utils.usage_meter import record_usage
from ..services.tutor_service import answer_doubt
from ..services.retention_service import compute_fsrs_update, get_todays_deck
from ..services.planner_service import generate_study_plan
from ..services.mcq_service import fetch_questions, grade_test
from ..models.schemas import ExamType

logger = logging.getLogger(__name__)

mcp = FastMCP("VidyAI MCP")

# ── Auth helper ────────────────────────────────────────────────────────────────

def _auth_partner(raw_key: str) -> dict:
    """Validate raw API key and return partner context. Raises on failure."""
    client = get_supabase_service_client()
    key_hash = _hash_key(raw_key)

    key_row = (
        client.table("partner_api_keys")
        .select("id, partner_id, is_active, expires_at")
        .eq("key_hash", key_hash)
        .maybe_single()
        .execute()
    )
    if not key_row.data or not key_row.data["is_active"]:
        raise PermissionError("Invalid or inactive API key")

    if key_row.data.get("expires_at"):
        if datetime.fromisoformat(key_row.data["expires_at"]) < datetime.utcnow():
            raise PermissionError("API key expired")

    partner = (
        client.table("partner_organizations")
        .select("id, name, tier, is_active, monthly_call_limit, calls_used_this_month, allowed_features")
        .eq("id", key_row.data["partner_id"])
        .single()
        .execute()
    )
    if not partner.data or not partner.data["is_active"]:
        raise PermissionError("Partner suspended")
    if partner.data["calls_used_this_month"] >= partner.data["monthly_call_limit"]:
        raise PermissionError("Monthly call limit exceeded")

    return {
        "partner_id": partner.data["id"],
        "key_id": key_row.data["id"],
        "allowed_features": partner.data["allowed_features"],
    }


def _resolve_student(partner_id: str, external_student_id: str) -> uuid.UUID | None:
    """Map partner's external_student_id → vidyai user_id. Creates mapping if new."""
    client = get_supabase_service_client()
    mapping = (
        client.table("partner_student_mappings")
        .select("vidyai_user_id")
        .eq("partner_id", partner_id)
        .eq("external_student_id", external_student_id)
        .maybe_single()
        .execute()
    )
    if mapping.data and mapping.data.get("vidyai_user_id"):
        return uuid.UUID(mapping.data["vidyai_user_id"])
    return None


def _ensure_mapping(partner_id: str, external_student_id: str, exam_type: str | None = None):
    client = get_supabase_service_client()
    client.table("partner_student_mappings").upsert({
        "partner_id": partner_id,
        "external_student_id": external_student_id,
        "exam_type": exam_type,
    }).execute()


# ── MCP TOOLS ─────────────────────────────────────────────────────────────────

@mcp.tool()
async def solve_doubt(
    question: str,
    student_id: str,
    subject: str | None = None,
    language: str = "en",
    session_context: str | None = None,
    _api_key: str = "",
) -> dict:
    """Answers a student's doubt using NCERT-grounded RAG (Claude 3.5 Sonnet)."""
    start = time.time()
    partner = _auth_partner(_api_key)
    _ensure_mapping(partner["partner_id"], student_id)
    vidyai_user_id = _resolve_student(partner["partner_id"], student_id)

    client = get_supabase_service_client()
    subject_id = None
    if subject:
        sub = client.table("subjects").select("id").eq("name", subject).maybe_single().execute()
        if sub.data:
            subject_id = uuid.UUID(sub.data["id"])

    sess = client.table("study_sessions").insert({
        "user_id": str(vidyai_user_id) if vidyai_user_id else str(uuid.uuid4()),
        "session_type": "doubt",
    }).execute()
    session_id = uuid.UUID(sess.data[0]["id"])

    try:
        result = await answer_doubt(
            user_id=vidyai_user_id or uuid.uuid4(),
            session_id=session_id,
            question=question,
            subject_id=subject_id,
            chapter_id=None,
            language=language,
            parent_doubt_id=None,
        )
        latency_ms = int((time.time() - start) * 1000)
        record_usage(partner["partner_id"], partner["key_id"], "solve_doubt", latency_ms, result.get("tokens_used", 0), 200)
        return {
            "answer": result["answer"],
            "sources": result["sources"],
            "related_concepts": result["related_concepts"],
            "language": result["answer_language"],
            "tokens_used": result["tokens_used"],
        }
    except Exception as e:
        record_usage(partner["partner_id"], partner["key_id"], "solve_doubt", int((time.time() - start) * 1000), 0, 500, str(e))
        raise


@mcp.tool()
async def get_revision_deck(
    student_id: str,
    exam_type: str,
    limit: int = 20,
    subject_filter: str | None = None,
    _api_key: str = "",
) -> dict:
    """Returns today's due revision cards for a student."""
    start = time.time()
    partner = _auth_partner(_api_key)
    _ensure_mapping(partner["partner_id"], student_id, exam_type)
    vidyai_user_id = _resolve_student(partner["partner_id"], student_id)

    if not vidyai_user_id:
        record_usage(partner["partner_id"], partner["key_id"], "get_revision_deck", int((time.time() - start) * 1000), 0, 200)
        return {"cards": [], "total_due": 0, "estimated_minutes": 0}

    result = await get_todays_deck(user_id=vidyai_user_id, limit=limit, include_new=True)

    cards = []
    today = date.today()
    for card in result.get("cards", []):
        concept = card.get("concepts") or {}
        scheduled = card.get("scheduled_date") or today.isoformat()
        try:
            days_overdue = (today - date.fromisoformat(scheduled)).days
        except Exception:
            days_overdue = 0
        cards.append({
            "concept_id": card.get("concept_id"),
            "concept_name": concept.get("name", ""),
            "subject": concept.get("subject_id", ""),
            "chapter": concept.get("chapter_id", ""),
            "mastery_score": card.get("mastery_score", 0),
            "days_overdue": max(0, days_overdue),
            "difficulty": concept.get("difficulty_level", "Medium"),
        })

    latency_ms = int((time.time() - start) * 1000)
    record_usage(partner["partner_id"], partner["key_id"], "get_revision_deck", latency_ms, 0, 200)
    return {"cards": cards, "total_due": result["total_due"], "estimated_minutes": result["estimated_minutes"]}


@mcp.tool()
async def submit_revision_result(
    student_id: str,
    concept_id: str,
    quality_score: int,
    response_time_ms: int,
    _api_key: str = "",
) -> dict:
    """Records revision outcome and updates FSRS parameters."""
    start = time.time()
    partner = _auth_partner(_api_key)
    vidyai_user_id = _resolve_student(partner["partner_id"], student_id)
    if not vidyai_user_id:
        raise ValueError(f"Student {student_id} not found")

    client = get_supabase_service_client()
    sess = client.table("study_sessions").insert({
        "user_id": str(vidyai_user_id),
        "session_type": "revision",
    }).execute()
    session_id = uuid.UUID(sess.data[0]["id"])

    result = await compute_fsrs_update(
        user_id=vidyai_user_id,
        concept_id=uuid.UUID(concept_id),
        quality_score=quality_score,
        response_time_ms=response_time_ms,
        session_id=session_id,
        hint_used=False,
    )

    latency_ms = int((time.time() - start) * 1000)
    record_usage(partner["partner_id"], partner["key_id"], "submit_revision_result", latency_ms, 0, 200)
    return {
        "next_review_date": result["next_review_date"].isoformat() if hasattr(result["next_review_date"], "isoformat") else str(result["next_review_date"]),
        "new_interval_days": result["new_interval_days"],
        "mastery_state": result["new_mastery_state"],
    }


@mcp.tool()
async def get_study_plan(
    student_id: str,
    exam_type: str,
    exam_date: str,
    plan_date: str | None = None,
    _api_key: str = "",
) -> dict:
    """Returns the student's study plan for a given date, generating one if needed."""
    start = time.time()
    partner = _auth_partner(_api_key)
    _ensure_mapping(partner["partner_id"], student_id, exam_type)
    vidyai_user_id = _resolve_student(partner["partner_id"], student_id)

    target_date = date.fromisoformat(plan_date) if plan_date else date.today()

    if not vidyai_user_id:
        record_usage(partner["partner_id"], partner["key_id"], "get_study_plan", int((time.time() - start) * 1000), 0, 200)
        return {"plan_date": target_date.isoformat(), "slots": [], "total_hours": 0, "completion_percent": 0}

    client = get_supabase_service_client()
    existing = (
        client.table("daily_study_plans")
        .select("*")
        .eq("user_id", str(vidyai_user_id))
        .eq("plan_date", target_date.isoformat())
        .maybe_single()
        .execute()
    )

    if existing.data:
        plan = existing.data
    else:
        result = await generate_study_plan(
            user_id=vidyai_user_id,
            exam_type=ExamType(exam_type),
            exam_date=date.fromisoformat(exam_date),
            daily_hours=6,
        )
        plan = result.get("today", {})

    latency_ms = int((time.time() - start) * 1000)
    record_usage(partner["partner_id"], partner["key_id"], "get_study_plan", latency_ms, 0, 200)
    return {
        "plan_date": target_date.isoformat(),
        "slots": plan.get("slots", []),
        "total_hours": plan.get("total_hours", 0),
        "completion_percent": plan.get("completion_percent", 0),
    }


@mcp.tool()
async def run_mcq_test(
    student_id: str,
    exam_type: str,
    subject: str | None = None,
    chapter_id: str | None = None,
    count: int = 10,
    mode: str = "practice",
    _api_key: str = "",
) -> dict:
    """Fetches a set of MCQ/PYQ questions for a test session."""
    start = time.time()
    partner = _auth_partner(_api_key)
    _ensure_mapping(partner["partner_id"], student_id, exam_type)
    vidyai_user_id = _resolve_student(partner["partner_id"], student_id)

    client = get_supabase_service_client()
    subject_id = None
    if subject:
        sub = client.table("subjects").select("id").eq("name", subject).maybe_single().execute()
        if sub.data:
            subject_id = uuid.UUID(sub.data["id"])

    questions = await fetch_questions(
        exam_type=ExamType(exam_type),
        subject_id=subject_id,
        chapter_id=uuid.UUID(chapter_id) if chapter_id else None,
        count=count,
        mode=mode,
        pyq_year_range=None,
        difficulty=None,
        user_id=vidyai_user_id or uuid.uuid4(),
    )

    sess = client.table("study_sessions").insert({
        "user_id": str(vidyai_user_id) if vidyai_user_id else str(uuid.uuid4()),
        "session_type": "test",
    }).execute()
    study_session_id = sess.data[0]["id"]

    expires_at = datetime.utcnow() + timedelta(minutes=60)
    test_sess = client.table("test_sessions").insert({
        "user_id": str(vidyai_user_id) if vidyai_user_id else str(uuid.uuid4()),
        "session_id": study_session_id,
        "exam_type": exam_type,
        "question_ids": [q["id"] for q in questions],
        "total_questions": len(questions),
        "duration_minutes": 60,
        "started_at": datetime.utcnow().isoformat(),
        "is_adaptive": mode == "adaptive",
    }).execute()

    safe_questions = [
        {k: v for k, v in q.items() if k != "correct_option"}
        for q in questions
    ]

    latency_ms = int((time.time() - start) * 1000)
    record_usage(partner["partner_id"], partner["key_id"], "run_mcq_test", latency_ms, 0, 200)
    return {
        "session_id": test_sess.data[0]["id"],
        "questions": safe_questions,
        "expires_at": expires_at.isoformat(),
    }


@mcp.tool()
async def submit_mcq_answers(
    student_id: str,
    session_id: str,
    answers: list[dict],
    _api_key: str = "",
) -> dict:
    """Grades an MCQ session and updates the student's knowledge graph."""
    start = time.time()
    partner = _auth_partner(_api_key)
    vidyai_user_id = _resolve_student(partner["partner_id"], student_id)

    client = get_supabase_service_client()
    for ans in answers:
        client.table("test_answers").upsert({
            "test_session_id": session_id,
            "question_id": ans["question_id"],
            "user_id": str(vidyai_user_id) if vidyai_user_id else str(uuid.uuid4()),
            "selected_option": ans.get("selected_option", "skipped"),
            "time_spent_ms": ans.get("time_spent_ms", 0),
        }).execute()

    result = await grade_test(
        user_id=vidyai_user_id or uuid.uuid4(),
        test_session_id=uuid.UUID(session_id),
    )

    latency_ms = int((time.time() - start) * 1000)
    record_usage(partner["partner_id"], partner["key_id"], "submit_mcq_answers", latency_ms, 0, 200)
    return {
        "score": result.get("score", 0),
        "accuracy": result.get("accuracy", 0),
        "results": result.get("results", []),
        "concept_updates": result.get("knowledge_graph_updates", []),
    }


@mcp.tool()
async def process_video(
    student_id: str,
    youtube_url: str,
    output_language: str = "en",
    _api_key: str = "",
) -> dict:
    """Enqueues a YouTube video for note extraction."""
    import re
    start = time.time()
    partner = _auth_partner(_api_key)
    _ensure_mapping(partner["partner_id"], student_id)
    vidyai_user_id = _resolve_student(partner["partner_id"], student_id)

    def _extract_vid_id(url: str) -> str:
        for p in [r"youtu\.be/([^?&]+)", r"youtube\.com/watch\?v=([^&]+)"]:
            m = re.search(p, url)
            if m:
                return m.group(1)
        return url

    client = get_supabase_service_client()
    row = client.table("processed_videos").insert({
        "user_id": str(vidyai_user_id) if vidyai_user_id else str(uuid.uuid4()),
        "youtube_url": youtube_url,
        "youtube_video_id": _extract_vid_id(youtube_url),
        "processing_status": "pending",
        "language_detected": output_language,
    }).execute()
    video_id = row.data[0]["id"]

    from ..workers.celery_app import celery_app
    task = celery_app.send_task("workers.video_worker.process_video_task", args=[video_id, output_language, False])
    client.table("processed_videos").update({"job_id": str(task.id)}).eq("id", video_id).execute()

    latency_ms = int((time.time() - start) * 1000)
    record_usage(partner["partner_id"], partner["key_id"], "process_video", latency_ms, 0, 202)
    return {"job_id": str(task.id), "status": "pending", "estimated_minutes": 5}


@mcp.tool()
async def get_video_status(job_id: str, _api_key: str = "") -> dict:
    """Polls the status of a video processing job."""
    partner = _auth_partner(_api_key)
    client = get_supabase_service_client()

    result = client.table("processed_videos").select("processing_status, structured_notes, summary, error_message").eq("job_id", job_id).maybe_single().execute()
    if not result.data:
        return {"status": "failed", "progress_percent": 0, "error": "job not found"}

    row = result.data
    progress = {"pending": 0, "processing": 50, "completed": 100, "failed": 0}.get(row["processing_status"], 0)

    record_usage(partner["partner_id"], partner["key_id"], "get_video_status", 0, 0, 200)
    return {
        "status": row["processing_status"],
        "progress_percent": progress,
        "notes": row.get("structured_notes") if row["processing_status"] == "completed" else None,
        "summary": row.get("summary") if row["processing_status"] == "completed" else None,
        "error": row.get("error_message"),
    }


# ── MCP RESOURCES ─────────────────────────────────────────────────────────────

@mcp.resource("vidyai://syllabus/{exam_type}")
async def resource_syllabus(exam_type: str) -> dict:
    """Full subject → chapter → concept tree for JEE, NEET, or UPSC."""
    client = get_supabase_service_client()
    subjects = client.table("subjects").select("*").contains("exam_types", [exam_type]).order("display_order").execute()
    result = []
    for subject in (subjects.data or []):
        chapters = client.table("chapters").select("id, name, chapter_number, weightage_percent").eq("subject_id", subject["id"]).order("chapter_number").execute()
        subject_data = {**subject, "chapters": []}
        for chapter in (chapters.data or []):
            concepts = client.table("concepts").select("id, name, difficulty_level, tags").eq("chapter_id", chapter["id"]).execute()
            subject_data["chapters"].append({**chapter, "concepts": concepts.data or []})
        result.append(subject_data)
    return {"exam_type": exam_type, "subjects": result}


@mcp.resource("vidyai://student/{student_id}/profile")
async def resource_student_profile(student_id: str) -> dict:
    """Student's mastery summary, streak, and exam date (by partner external ID)."""
    client = get_supabase_service_client()
    mapping = (
        client.table("partner_student_mappings")
        .select("vidyai_user_id, exam_type")
        .eq("external_student_id", student_id)
        .maybe_single()
        .execute()
    )
    if not mapping.data or not mapping.data.get("vidyai_user_id"):
        return {"student_id": student_id, "profile": None}

    uid = mapping.data["vidyai_user_id"]
    profile = client.table("profiles").select("exam_target, exam_date, subscription_tier, streak_count, daily_study_hours").eq("id", uid).maybe_single().execute()
    streak = client.table("revision_streaks").select("current_streak, longest_streak").eq("user_id", uid).maybe_single().execute()
    lcs = client.table("learner_concept_states").select("mastery_state").eq("user_id", uid).execute()
    states = [r["mastery_state"] for r in (lcs.data or [])]
    mastery_summary = {s: states.count(s) for s in ["mastered", "learning", "reviewing", "unseen", "forgotten"]}

    return {
        "student_id": student_id,
        "profile": profile.data,
        "streak": streak.data,
        "mastery_summary": mastery_summary,
    }


@mcp.resource("vidyai://student/{student_id}/knowledge-graph")
async def resource_knowledge_graph(student_id: str) -> dict:
    """Full learner_concept_states for a student mapped via partner external ID."""
    client = get_supabase_service_client()
    mapping = (
        client.table("partner_student_mappings")
        .select("vidyai_user_id")
        .eq("external_student_id", student_id)
        .maybe_single()
        .execute()
    )
    if not mapping.data or not mapping.data.get("vidyai_user_id"):
        return {"student_id": student_id, "concepts": []}

    uid = mapping.data["vidyai_user_id"]
    states = (
        client.table("learner_concept_states")
        .select("concept_id, mastery_state, mastery_score, next_review_date, interval_days, concepts(name, subject_id)")
        .eq("user_id", uid)
        .execute()
    )
    return {"student_id": student_id, "concepts": states.data or []}


# ── MCP PROMPTS ───────────────────────────────────────────────────────────────

@mcp.prompt()
def explain_concept(concept_name: str, subject: str, exam_type: str, language: str = "en") -> str:
    """System prompt template for explaining a concept in exam context."""
    lang_note = {
        "hi": "Respond in Hindi.",
        "hinglish": "Respond in Hinglish (mix of Hindi and English).",
        "en": "Respond in English.",
    }.get(language, "Respond in English.")

    return f"""You are an expert {exam_type} tutor specializing in {subject}.
Explain the concept "{concept_name}" clearly and concisely for a student preparing for {exam_type}.
{lang_note}

Guidelines:
- Start with a one-sentence definition
- Give the key formula or principle if applicable
- Provide one real-world or exam-relevant example
- Mention common mistakes students make
- End with a memory tip or mnemonic if helpful
- Keep the explanation under 300 words
- Reference NCERT when applicable"""


@mcp.prompt()
def motivate_student(student_name: str, streak_days: int, exam_date: str, weak_subjects: list[str]) -> str:
    """Motivational prompt grounded in the student's actual stats."""
    days_left = (date.fromisoformat(exam_date) - date.today()).days
    weak_str = ", ".join(weak_subjects) if weak_subjects else "none identified yet"

    return f"""You are a supportive and knowledgeable {""} mentor for {student_name}, an Indian competitive exam aspirant.

Student stats:
- Current study streak: {streak_days} days
- Days until exam: {days_left}
- Subjects needing attention: {weak_str}

Generate a short, genuine motivational message (3-4 sentences) that:
- Acknowledges their streak specifically
- Gives one concrete, actionable study tip for their weak subjects
- Keeps the tone warm, encouraging, and grounded in their real progress
- Does NOT use generic platitudes — be specific and personal
- Can include Hindi words naturally if appropriate"""


# ── Mount as FastAPI router ────────────────────────────────────────────────────

router = APIRouter()

@router.api_route("/mcp", methods=["GET", "POST"])
async def mcp_endpoint(request: Request):
    """MCP HTTP+SSE endpoint. Auth via Bearer <partner_api_key> in headers."""
    # FastMCP handles the JSON-RPC dispatch internally
    return await mcp.handle_request(request)
