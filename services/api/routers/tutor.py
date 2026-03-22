import uuid
import logging
from fastapi import APIRouter, HTTPException, Query, status

from ..dependencies import CurrentUserID
from ..models.schemas import AskRequest, AskResponse, FeedbackRequest
from ..services.tutor_service import answer_doubt
from ..utils.supabase_client import get_supabase_service_client

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/ask", response_model=AskResponse)
async def ask(body: AskRequest, user_id: CurrentUserID):
    client = get_supabase_service_client()

    session_id = body.session_id
    if not session_id:
        sess = client.table("study_sessions").insert({
            "user_id": str(user_id),
            "session_type": "doubt",
        }).execute()
        session_id = uuid.UUID(sess.data[0]["id"])

    result = await answer_doubt(
        user_id=user_id,
        session_id=session_id,
        question=body.question,
        subject_id=body.subject_id,
        chapter_id=body.chapter_id,
        language=body.language.value,
        parent_doubt_id=body.parent_doubt_id,
    )
    return result


@router.get("/history")
async def get_history(
    user_id: CurrentUserID,
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0, ge=0),
    subject_id: uuid.UUID | None = Query(default=None),
):
    client = get_supabase_service_client()
    query = client.table("doubt_sessions").select("*", count="exact").eq("user_id", str(user_id)).order("created_at", desc=True).range(offset, offset + limit - 1)
    if subject_id:
        query = query.eq("subject_id", str(subject_id))
    result = query.execute()
    return {"doubts": result.data, "total": result.count}


@router.get("/doubt/{doubt_id}")
async def get_doubt(doubt_id: uuid.UUID, user_id: CurrentUserID):
    client = get_supabase_service_client()
    result = client.table("doubt_sessions").select("*").eq("id", str(doubt_id)).eq("user_id", str(user_id)).maybe_single().execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": "not_found", "code": "DOUBT_NOT_FOUND"})
    return {"doubt": result.data}


@router.post("/doubt/{doubt_id}/feedback")
async def submit_feedback(doubt_id: uuid.UUID, body: FeedbackRequest, user_id: CurrentUserID):
    client = get_supabase_service_client()
    client.table("doubt_sessions").update({"was_helpful": body.was_helpful}).eq("id", str(doubt_id)).eq("user_id", str(user_id)).execute()
    return {"success": True}
