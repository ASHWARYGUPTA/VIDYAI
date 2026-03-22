import uuid
import logging
from fastapi import APIRouter, Query
from ..dependencies import CurrentUserID
from ..utils.supabase_client import get_supabase_service_client

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/subjects")
async def get_subjects(user_id: CurrentUserID, exam_type: str | None = Query(default=None)):
    client = get_supabase_service_client()
    query = client.table("subjects").select("*").order("display_order")
    if exam_type:
        query = query.contains("exam_types", [exam_type])
    result = query.execute()
    return {"subjects": result.data}


@router.get("/chapters")
async def get_chapters(
    user_id: CurrentUserID,
    subject_id: uuid.UUID | None = Query(default=None),
    exam_type: str | None = Query(default=None),
):
    client = get_supabase_service_client()
    query = client.table("chapters").select("*").order("chapter_number")
    if subject_id:
        query = query.eq("subject_id", str(subject_id))
    if exam_type:
        query = query.contains("exam_types", [exam_type])
    result = query.execute()
    return {"chapters": result.data}


@router.get("/concepts")
async def get_concepts(user_id: CurrentUserID, chapter_id: uuid.UUID | None = Query(default=None)):
    client = get_supabase_service_client()
    query = client.table("concepts").select("id, name, description, difficulty_level, exam_relevance, tags")
    if chapter_id:
        query = query.eq("chapter_id", str(chapter_id))
    result = query.execute()
    return {"concepts": result.data}


@router.get("/concept/{concept_id}")
async def get_concept(concept_id: uuid.UUID, user_id: CurrentUserID):
    client = get_supabase_service_client()
    result = client.table("concepts").select("*").eq("id", str(concept_id)).single().execute()
    concept = result.data
    prereqs, related = [], []
    if concept.get("prerequisite_concept_ids"):
        prereqs = client.table("concepts").select("id, name, difficulty_level").in_("id", concept["prerequisite_concept_ids"]).execute().data
    if concept.get("related_concept_ids"):
        related = client.table("concepts").select("id, name, difficulty_level").in_("id", concept["related_concept_ids"]).execute().data
    return {"concept": concept, "prerequisites": prereqs, "related": related}
