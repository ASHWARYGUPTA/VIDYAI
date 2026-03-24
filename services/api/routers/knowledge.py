"""
Knowledge Base API
==================
Admin-only endpoints for uploading, listing, and deleting source documents.
Students indirectly benefit through the PageIndex RAG pipeline in the AI Tutor.
"""

import json
import uuid
import logging
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, Query, UploadFile, status

from ..dependencies import CurrentUserID
from ..utils.supabase_client import get_supabase_service_client
from ..services import knowledge_service

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_EXTENSIONS = {"pdf", "jpg", "jpeg", "png", "webp"}
MAX_FILE_MB = 50
VALID_DOC_TYPES = {"ncert", "pyq", "reference_book", "notes", "syllabus", "other"}


# ── Upload ─────────────────────────────────────────────────────────────────────

@router.post("/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    background_tasks: BackgroundTasks,
    user_id: CurrentUserID,
    file: UploadFile = File(...),
    title: str = Form(..., min_length=2, max_length=200),
    description: str = Form(default=""),
    exam_types: str = Form(...),          # JSON: '["JEE","NEET"]'
    subject: str = Form(default=""),
    document_type: str = Form(...),
    year: Optional[int] = Form(default=None),
    class_level: str = Form(default=""),
):
    """
    Accepts a PDF or image, stores it in Supabase Storage, and enqueues
    the PageIndex extraction pipeline as a background task.
    """
    # ── Validate file ──────────────────────────────────────────────────────
    filename = file.filename or "upload"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "invalid_file_type", "allowed": sorted(ALLOWED_EXTENSIONS)},
        )
    if document_type not in VALID_DOC_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "invalid_document_type", "allowed": sorted(VALID_DOC_TYPES)},
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={"error": "file_too_large", "max_mb": MAX_FILE_MB},
        )

    # ── Parse exam_types ───────────────────────────────────────────────────
    try:
        exam_type_list: list[str] = json.loads(exam_types)
        if not isinstance(exam_type_list, list):
            exam_type_list = [exam_types]
    except Exception:
        exam_type_list = [t.strip() for t in exam_types.split(",") if t.strip()]

    valid_exams = {"JEE", "NEET", "UPSC"}
    exam_type_list = [e for e in exam_type_list if e in valid_exams]
    if not exam_type_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "invalid_exam_types", "valid": sorted(valid_exams)},
        )

    client = get_supabase_service_client()
    doc_id = str(uuid.uuid4())

    # ── Upload to Supabase Storage ─────────────────────────────────────────
    storage_path = f"knowledge/{doc_id}/{filename}"
    try:
        # Ensure bucket exists (creates it if missing — safe to call repeatedly)
        try:
            client.storage.create_bucket("knowledge-base", options={"public": False})
        except Exception:
            pass  # already exists

        client.storage.from_("knowledge-base").upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": file.content_type or "application/octet-stream"},
        )
    except Exception as e:
        logger.error("Storage upload failed: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "storage_upload_failed", "detail": str(e)},
        )

    # ── Insert document record ─────────────────────────────────────────────
    client.table("knowledge_documents").insert({
        "id":               doc_id,
        "title":            title,
        "description":      description or None,
        "exam_types":       exam_type_list,
        "subject":          subject.strip() or None,
        "document_type":    document_type,
        "year":             year,
        "class_level":      class_level.strip() or None,
        "file_path":        storage_path,
        "file_name":        filename,
        "file_type":        ext,
        "file_size_bytes":  len(file_bytes),
        "processing_status": "pending",
        "uploaded_by":      str(user_id),
    }).execute()

    # ── Enqueue background processing ──────────────────────────────────────
    background_tasks.add_task(
        knowledge_service.process_document,
        document_id=doc_id,
        file_bytes=file_bytes,
        file_type=ext,
        exam_types=exam_type_list,
        subject=subject.strip() or None,
        doc_type=document_type,
    )

    logger.info("Document queued", extra={"doc_id": doc_id, "user_id": str(user_id)})
    return {
        "document_id": doc_id,
        "status": "pending",
        "file_name": filename,
        "message": "Uploaded — PageIndex processing running in background.",
    }


# ── List ───────────────────────────────────────────────────────────────────────

@router.get("/documents")
async def list_documents(
    user_id: CurrentUserID,
    exam_type: Optional[str] = Query(default=None),
    document_type: Optional[str] = Query(default=None),
    processing_status: Optional[str] = Query(default=None),
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0, ge=0),
):
    client = get_supabase_service_client()
    query = (
        client.table("knowledge_documents")
        .select("id,title,exam_types,subject,document_type,year,file_name,file_type,"
                "file_size_bytes,page_count,processing_status,chunk_count,created_at,error_message",
                count="exact")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
    )
    if document_type:
        query = query.eq("document_type", document_type)
    if processing_status:
        query = query.eq("processing_status", processing_status)
    result = query.execute()
    return {"documents": result.data or [], "total": result.count or 0}


# ── Single document ────────────────────────────────────────────────────────────

@router.get("/documents/{doc_id}")
async def get_document(doc_id: uuid.UUID, user_id: CurrentUserID):
    client = get_supabase_service_client()
    result = (
        client.table("knowledge_documents")
        .select("id,title,description,exam_types,subject,document_type,year,class_level,"
                "file_name,file_type,file_size_bytes,page_count,processing_status,"
                "chunk_count,error_message,page_index_tree,created_at,updated_at")
        .eq("id", str(doc_id))
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail={"error": "not_found"})
    return {"document": result.data}


# ── Delete ─────────────────────────────────────────────────────────────────────

@router.delete("/documents/{doc_id}", status_code=status.HTTP_200_OK)
async def delete_document(doc_id: uuid.UUID, user_id: CurrentUserID):
    client = get_supabase_service_client()
    doc = (
        client.table("knowledge_documents")
        .select("file_path")
        .eq("id", str(doc_id))
        .single()
        .execute()
    )
    if doc.data:
        try:
            client.storage.from_("knowledge-base").remove([doc.data["file_path"]])
        except Exception:
            pass  # non-critical; record will still be deleted
    client.table("knowledge_documents").delete().eq("id", str(doc_id)).execute()
    return {"deleted": True}


# ── Search (PageIndex tree search) ────────────────────────────────────────────

@router.get("/search")
async def search_knowledge(
    user_id: CurrentUserID,
    q: str = Query(..., min_length=3, max_length=500),
    exam_type: Optional[str] = Query(default=None),
    subject: Optional[str] = Query(default=None),
    limit: int = Query(default=5, le=20),
):
    """Test the PageIndex retrieval pipeline directly."""
    from ..config import get_settings
    settings = get_settings()
    if not settings.gemini_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": "gemini_key_not_configured"},
        )

    results = await knowledge_service.search_knowledge(
        query=q,
        exam_type=exam_type,
        subject=subject,
        limit=limit,
    )

    return {
        "query": q,
        "results": results,
        "count": len(results),
    }


# ── Reprocess ──────────────────────────────────────────────────────────────────

@router.post("/documents/{doc_id}/reprocess", status_code=status.HTTP_202_ACCEPTED)
async def reprocess_document(
    doc_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    user_id: CurrentUserID,
):
    """Re-triggers PageIndex extraction for a document that failed."""
    client = get_supabase_service_client()
    doc = (
        client.table("knowledge_documents")
        .select("file_path, file_type, exam_types, subject, document_type, chunk_count")
        .eq("id", str(doc_id))
        .single()
        .execute()
    )
    if not doc.data:
        raise HTTPException(status_code=404, detail={"error": "not_found"})

    # Download file bytes from storage
    try:
        file_bytes = client.storage.from_("knowledge-base").download(doc.data["file_path"])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "storage_download_failed", "detail": str(e)},
        )

    # Reset status and clear old index
    client.table("knowledge_documents").update({
        "processing_status": "pending",
        "chunk_count": 0,
        "page_index_tree": None,
        "page_texts": None,
        "error_message": None,
    }).eq("id", str(doc_id)).execute()

    background_tasks.add_task(
        knowledge_service.process_document,
        document_id=str(doc_id),
        file_bytes=file_bytes,
        file_type=doc.data["file_type"],
        exam_types=doc.data["exam_types"] or [],
        subject=doc.data["subject"],
        doc_type=doc.data["document_type"],
    )

    return {"document_id": str(doc_id), "status": "requeued"}


# ── Debug / Health check ───────────────────────────────────────────────────────

@router.get("/debug")
async def knowledge_debug(user_id: CurrentUserID):
    """
    Diagnostic endpoint — verifies the PageIndex pipeline is healthy.
    """
    client = get_supabase_service_client()
    out: dict = {}

    # 1. Check tables exist
    try:
        docs_result = client.table("knowledge_documents").select("id", count="exact").limit(1).execute()
        out["tables_exist"] = True
        out["document_count"] = docs_result.count or 0
    except Exception as e:
        out["tables_exist"] = False
        out["table_error"] = str(e)
        return out

    # 2. Counts by status
    try:
        status_result = client.table("knowledge_documents").select("processing_status").execute()
        status_counts: dict = {}
        for row in (status_result.data or []):
            s = row.get("processing_status", "unknown")
            status_counts[s] = status_counts.get(s, 0) + 1
        out["status_counts"] = status_counts
    except Exception as e:
        out["status_error"] = str(e)

    # 3. PageIndex coverage
    try:
        indexed = client.table("knowledge_documents").select(
            "id", count="exact"
        ).not_.is_("page_index_tree", "null").limit(1).execute()
        out["indexed_documents"] = indexed.count or 0
    except Exception as e:
        out["index_error"] = str(e)

    # 3b. Show documents with no tree (broken processing)
    try:
        no_tree = (
            client.table("knowledge_documents")
            .select("id, title, processing_status, error_message")
            .eq("processing_status", "completed")
            .is_("page_index_tree", "null")
            .execute()
        )
        if no_tree.data:
            out["completed_without_tree"] = [
                {"title": r["title"], "id": r["id"]} for r in no_tree.data
            ]
    except Exception:
        pass

    # 4. Check OpenRouter API key
    from ..config import get_settings
    settings = get_settings()
    out["openrouter_key_loaded"] = bool(settings.openrouter_api_key)
    if settings.openrouter_api_key:
        out["openrouter_key_prefix"] = settings.openrouter_api_key[:8] + "..."

    # 5. Test OpenRouter LLM call
    try:
        from ..utils.llm import get_llm
        from langchain_core.messages import HumanMessage
        llm = get_llm(temperature=0, max_tokens=10)
        resp = llm.invoke([HumanMessage(content="Respond with exactly: OK")])
        out["openrouter_ok"] = (resp.content or "").strip().startswith("OK")

        # 6. Test tree search on first indexed doc
        first_indexed = (
            client.table("knowledge_documents")
            .select("id, title, page_index_tree")
            .eq("processing_status", "completed")
            .not_.is_("page_index_tree", "null")
            .limit(1)
            .execute()
        )
        if first_indexed.data:
            tree = first_indexed.data[0].get("page_index_tree", {})
            structure = tree.get("structure", [])
            node_count = knowledge_service._count_nodes(structure)
            out["test_doc_title"] = first_indexed.data[0]["title"]
            out["test_doc_tree_nodes"] = node_count
        else:
            out["test_doc"] = "no indexed documents"

    except Exception as e:
        out["gemini_ok"] = False
        out["gemini_error"] = str(e)

    return out


# ── Stats ──────────────────────────────────────────────────────────────────────

@router.get("/stats")
async def knowledge_stats(user_id: CurrentUserID):
    client = get_supabase_service_client()
    docs = client.table("knowledge_documents").select(
        "processing_status, document_type, exam_types, chunk_count, page_count, file_size_bytes, page_index_tree"
    ).execute()
    rows = docs.data or []

    by_type: dict = {}
    by_exam: dict = {}
    total_nodes = 0
    total_pages = 0
    total_bytes = 0

    for r in rows:
        dt = r.get("document_type", "other")
        by_type[dt] = by_type.get(dt, 0) + 1
        for et in (r.get("exam_types") or []):
            by_exam[et] = by_exam.get(et, 0) + 1
        total_nodes += r.get("chunk_count") or 0
        total_pages += r.get("page_count") or 0
        total_bytes += r.get("file_size_bytes") or 0

    completed = sum(1 for r in rows if r.get("processing_status") == "completed")
    indexed = sum(1 for r in rows if r.get("page_index_tree") is not None)

    return {
        "total_documents":  len(rows),
        "completed":        completed,
        "indexed":          indexed,
        "processing":       sum(1 for r in rows if r.get("processing_status") == "processing"),
        "failed":           sum(1 for r in rows if r.get("processing_status") == "failed"),
        "pending":          sum(1 for r in rows if r.get("processing_status") == "pending"),
        "total_tree_nodes": total_nodes,
        "total_pages":      total_pages,
        "total_bytes":      total_bytes,
        "by_document_type": by_type,
        "by_exam_type":     by_exam,
    }
