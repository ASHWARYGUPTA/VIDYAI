"""
Knowledge Base — PageIndex pipeline
=====================================
File → extract page texts → build PageIndex tree (LLM-powered TOC) → store in Postgres

Replaces the old chunk + embed vector-RAG approach with hierarchical
tree-based retrieval.  When a student asks a question the LLM reasons
over the tree (titles + summaries) to locate the right pages, then
those page texts are passed as context.

Token-efficiency notes
-----------------------
- PageIndex uses litellm, so the same Gemini key works via model prefix
  ``gemini/gemini-2.0-flash``.
- Digital PDFs are parsed free with PyPDF2; only scanned pages hit the
  Gemini Vision API.
- Tree search costs 1 LLM call to locate relevant nodes, not N embedding
  calls.
"""

import io
import json
import logging
import os
import sys
import tempfile
import uuid
from typing import Optional

# Ensure vendored pageindex is importable
_api_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _api_root not in sys.path:
    sys.path.insert(0, _api_root)

logger = logging.getLogger(__name__)

# ── PageIndex config ──────────────────────────────────────────────────────────
_PAGEINDEX_MODEL = None  # uses LLM_MODEL from env
_SEARCH_MODEL = None     # uses LLM_MODEL from env


# ═══════════════════════════════════════════════════════════════════════════════
# TEXT EXTRACTION  (kept for image fallback + storing page_texts)
# ═══════════════════════════════════════════════════════════════════════════════

def extract_page_texts_pdf(file_bytes: bytes) -> list[str]:
    """
    Returns a list of strings where index i = text of page i+1.
    Digital pages use PyPDF2 (free).  Scanned pages fall back to
    Gemini Vision OCR.
    """
    import PyPDF2

    reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
    page_texts: list[str] = []
    scanned_indices: list[int] = []

    for i, page in enumerate(reader.pages):
        text = (page.extract_text() or "").strip()
        if len(text) >= 80:
            page_texts.append(text)
        else:
            page_texts.append("")          # placeholder
            scanned_indices.append(i)      # 0-based

    # OCR scanned pages via Gemini Vision
    if scanned_indices:
        ocr_results = _ocr_pdf_pages_gemini(file_bytes, scanned_indices)
        for idx, ocr_text in zip(scanned_indices, ocr_results):
            if ocr_text and len(ocr_text.strip()) >= 40:
                page_texts[idx] = ocr_text.strip()

    return page_texts


def extract_text_from_image(file_bytes: bytes, mime_type: str) -> str:
    """OCR a single image file via OpenRouter (vision model)."""
    import base64
    from ..utils.llm import get_llm
    from langchain_core.messages import HumanMessage

    b64 = base64.b64encode(file_bytes).decode("utf-8")
    try:
        llm = get_llm(temperature=0, max_tokens=2048)
        response = llm.invoke([HumanMessage(content=[
            {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{b64}"}},
            {"type": "text", "text": "Extract all text from this image in reading order. Return only the text."},
        ])])
        return (response.content or "").strip()
    except Exception as e:
        logger.warning("Image OCR failed", extra={"error": str(e)})
        return ""


def _ocr_pdf_pages_gemini(pdf_bytes: bytes, page_indices: list[int]) -> list[str]:
    """
    OCR specific pages of a PDF via OpenRouter (vision model).
    Batched in groups of 5 to respect rate limits.
    """
    import base64
    from ..utils.llm import get_llm
    from langchain_core.messages import HumanMessage

    b64 = base64.b64encode(pdf_bytes).decode("utf-8")
    results = [""] * len(page_indices)

    for batch_start in range(0, len(page_indices), 5):
        batch = page_indices[batch_start: batch_start + 5]
        page_list = ", ".join(str(p + 1) for p in batch)
        prompt = (
            f"Extract all readable text from pages {page_list} of this PDF. "
            "Return only the extracted text in reading order. No commentary."
        )
        try:
            llm = get_llm(temperature=0, max_tokens=4096)
            response = llm.invoke([HumanMessage(content=[
                {"type": "image_url", "image_url": {"url": f"data:application/pdf;base64,{b64}"}},
                {"type": "text", "text": prompt},
            ])])
            combined = (response.content or "").strip()
            chunk_size = max(1, len(combined) // len(batch))
            for j, _ in enumerate(batch):
                results[batch_start + j] = combined[j * chunk_size: (j + 1) * chunk_size]
        except Exception as e:
            logger.warning("OCR batch failed", extra={"error": str(e)})

    return results


# ═══════════════════════════════════════════════════════════════════════════════
# PAGEINDEX: BUILD TREE
# ═══════════════════════════════════════════════════════════════════════════════

def build_page_index(file_bytes: bytes, model: str = _PAGEINDEX_MODEL) -> dict:
    """
    Run PageIndex on a PDF.
    Returns the tree dict: {doc_name, doc_description?, structure: [...]}.
    """
    from pageindex import page_index_main
    from pageindex.utils import ConfigLoader
    from ..config import get_settings

    settings = get_settings()
    # litellm reads OPENROUTER_API_KEY from env for openrouter/* models
    if settings.openrouter_api_key:
        os.environ["OPENROUTER_API_KEY"] = settings.openrouter_api_key

    opt = ConfigLoader().load({
        "model": model,
        "if_add_node_summary": "yes",
        "if_add_node_id": "yes",
        "if_add_doc_description": "yes",
        "if_add_node_text": "no",      # we store page_texts separately
    })

    # PageIndex expects a file path — write to temp file
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
        f.write(file_bytes)
        temp_path = f.name

    try:
        tree = page_index_main(temp_path, opt)
    finally:
        os.unlink(temp_path)

    return tree


def _build_image_tree(text: str, title: str) -> dict:
    """Build a minimal single-node tree for an image document."""
    summary = text[:300] if text else ""
    return {
        "doc_name": title,
        "doc_description": summary,
        "structure": [{
            "title": title,
            "node_id": "0000",
            "start_index": 1,
            "end_index": 1,
            "summary": summary,
        }],
    }


# ═══════════════════════════════════════════════════════════════════════════════
# TREE SEARCH  (reasoning-based retrieval)
# ═══════════════════════════════════════════════════════════════════════════════

def _flatten_tree_for_search(tree_structure: list, prefix: str = "") -> list[dict]:
    """
    Flatten tree nodes into a compact list for the LLM to reason over.
    Returns [{node_id, title, summary, start_index, end_index, depth}, ...].
    """
    flat = []
    for node in (tree_structure if isinstance(tree_structure, list) else [tree_structure]):
        flat.append({
            "node_id": node.get("node_id", ""),
            "title": node.get("title", ""),
            "summary": node.get("summary", ""),
            "start_index": node.get("start_index"),
            "end_index": node.get("end_index"),
        })
        if node.get("nodes"):
            flat.extend(_flatten_tree_for_search(node["nodes"]))
    return flat


def _find_node_by_id(tree_structure, node_id: str) -> Optional[dict]:
    """Find a node in the tree by its node_id."""
    nodes = tree_structure if isinstance(tree_structure, list) else [tree_structure]
    for node in nodes:
        if node.get("node_id") == node_id:
            return node
        if node.get("nodes"):
            found = _find_node_by_id(node["nodes"], node_id)
            if found:
                return found
    return None


def _build_video_index_tree(title: str, summary: str, notes: list[dict]) -> tuple[dict, list[str]]:
    """
    Build a PageIndex-style tree from a processed video's structured notes.
    Returns (tree_dict, page_texts) where:
      - page_texts[0] = overall summary (page 1)
      - page_texts[i] = note section i content (page i+1)
    """
    page_texts: list[str] = [summary or title]
    structure: list[dict] = [{
        "title": "Summary",
        "node_id": "0000",
        "start_index": 1,
        "end_index": 1,
        "summary": (summary or "")[:300],
    }]

    for i, note in enumerate(notes):
        content = note.get("content", "")
        heading = note.get("heading", f"Section {i + 1}")
        page_texts.append(content)
        structure.append({
            "title": heading,
            "node_id": f"{i + 1:04d}",
            "start_index": i + 2,
            "end_index": i + 2,
            "summary": content[:300],
        })

    tree = {
        "doc_name": title,
        "doc_description": summary or "",
        "structure": structure,
    }
    return tree, page_texts


async def search_knowledge(
    query: str,
    exam_type: Optional[str] = None,
    subject: Optional[str] = None,
    user_id: Optional[str] = None,
    limit: int = 5,
) -> list[dict]:
    """
    Search across indexed knowledge documents AND the user's processed video
    transcripts using PageIndex tree reasoning.

    Flow:
      1. Fetch completed knowledge documents (filtered by exam/subject).
      2. If user_id given, also fetch the user's indexed video transcripts.
      3. Build a compact index of all trees (titles + summaries).
      4. Single LLM call: ask which nodes answer the query.
      5. Extract page texts from those nodes and return context list.
    """
    from ..config import get_settings
    from ..utils.supabase_client import get_supabase_service_client

    settings = get_settings()
    client_db = get_supabase_service_client()

    # 1. Fetch indexed knowledge documents
    q = (
        client_db.table("knowledge_documents")
        .select("id, title, page_index_tree, page_texts, subject, exam_types, document_type")
        .eq("processing_status", "completed")
        .not_.is_("page_index_tree", "null")
        .order("created_at", desc=True)
        .limit(30)
    )
    if subject:
        q = q.eq("subject", subject)
    docs_result = q.execute()
    docs = docs_result.data or []

    # Client-side exam filter (exam_types is an array column)
    if exam_type:
        docs = [d for d in docs if exam_type in (d.get("exam_types") or [])]

    # 2. Build compact index for LLM
    doc_index_parts = []
    doc_map: dict = {}   # key -> row + meta

    for doc in docs:
        tree = doc.get("page_index_tree")
        if not tree or not tree.get("structure"):
            continue
        key = doc["id"]
        doc_map[key] = {**doc, "_source": "document"}
        flat_nodes = _flatten_tree_for_search(tree["structure"])
        doc_index_parts.append({
            "doc_id": key,
            "doc_title": doc["title"],
            "doc_description": tree.get("doc_description", ""),
            "subject": doc.get("subject", ""),
            "nodes": [
                {"node_id": n["node_id"], "title": n["title"],
                 "summary": n.get("summary", ""),
                 "pages": f"{n['start_index']}-{n['end_index']}"}
                for n in flat_nodes
            ],
        })

    # 2b. Fetch user's indexed video transcripts
    if user_id:
        try:
            vq = (
                client_db.table("processed_videos")
                .select("id, title, page_index_tree, page_texts, youtube_video_id")
                .eq("processing_status", "completed")
                .eq("user_id", user_id)
                .not_.is_("page_index_tree", "null")
                .order("created_at", desc=True)
                .limit(20)
            )
            videos_result = vq.execute()
            for video in (videos_result.data or []):
                tree = video.get("page_index_tree")
                if not tree or not tree.get("structure"):
                    continue
                key = f"video_{video['id']}"
                doc_map[key] = {**video, "_source": "lecture"}
                flat_nodes = _flatten_tree_for_search(tree["structure"])
                doc_index_parts.append({
                    "doc_id": key,
                    "doc_title": video["title"],
                    "doc_description": tree.get("doc_description", ""),
                    "subject": "lecture",
                    "nodes": [
                        {"node_id": n["node_id"], "title": n["title"],
                         "summary": n.get("summary", ""),
                         "pages": f"{n['start_index']}-{n['end_index']}"}
                        for n in flat_nodes
                    ],
                })
        except Exception as e:
            logger.warning("Failed to fetch video transcripts for search", extra={"error": str(e)})

    if not doc_index_parts:
        return []

    # 3. Ask LLM which nodes are relevant
    index_json = json.dumps(doc_index_parts, ensure_ascii=False)

    prompt = (
        "You are a search engine for educational documents and lecture transcripts. "
        "Given the document index below and a student's query, identify the most relevant nodes.\n\n"
        f"DOCUMENT INDEX:\n{index_json}\n\n"
        f"STUDENT QUERY: {query}\n\n"
        f"Return ONLY a valid JSON array of the top {limit} most relevant results, each with:\n"
        '{"doc_id": "...", "node_id": "...", "relevance": "high|medium"}\n'
        "If no nodes are relevant, return an empty array [].\n"
        "Return ONLY the JSON array, no other text."
    )

    from ..utils.llm import get_llm
    from langchain_core.messages import HumanMessage
    try:
        llm = get_llm(model=_SEARCH_MODEL, temperature=0, max_tokens=512)
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        raw = response.content or ""
        # Strip Qwen3 <think>...</think> reasoning block
        if "<think>" in raw:
            end = raw.find("</think>")
            raw = raw[end + len("</think>"):] if end != -1 else raw
        # Strip markdown code fences if present
        if "```" in raw:
            raw = raw[raw.find("["):raw.rfind("]") + 1]
        elif "[" in raw:
            raw = raw[raw.find("["):raw.rfind("]") + 1]
        matches = json.loads(raw.strip())
    except Exception as e:
        logger.error("Tree search LLM call failed: %s", e, exc_info=True)
        return []

    if not isinstance(matches, list):
        return []

    # 4. Extract page texts from matched nodes
    results = []
    for match in matches[:limit]:
        doc_id = match.get("doc_id")
        node_id = match.get("node_id")
        entry = doc_map.get(doc_id)
        if not entry:
            continue

        source_type = entry.get("_source", "document")
        tree = entry.get("page_index_tree", {})
        page_texts = entry.get("page_texts") or []
        node = _find_node_by_id(tree.get("structure", []), node_id)
        if not node:
            continue

        start = node.get("start_index", 1)
        end = node.get("end_index", start)
        # page_texts is 0-indexed, start_index is 1-indexed
        content = "\n".join(page_texts[start - 1: end]) if page_texts else ""

        result = {
            "doc_id": doc_id,
            "doc_title": entry.get("title", ""),
            "node_id": node_id,
            "title": node.get("title", ""),
            "summary": node.get("summary", ""),
            "page_range": f"{start}-{end}",
            "page_number": start,
            "section_heading": node.get("title", ""),
            "source_type": source_type,
            "content": content[:3000],
            "relevance": match.get("relevance", "medium"),
        }

        if source_type == "lecture":
            result["youtube_video_id"] = entry.get("youtube_video_id", "")
            result["document_type"] = "lecture"
            result["subject"] = "lecture"
        else:
            result["subject"] = entry.get("subject", "")
            result["document_type"] = entry.get("document_type", "")

        results.append(result)

    logger.info("Tree search completed", extra={
        "query_len": len(query), "matches": len(results),
    })
    return results


# ═══════════════════════════════════════════════════════════════════════════════
# FULL PIPELINE (runs in background task)
# ═══════════════════════════════════════════════════════════════════════════════

def process_document(
    document_id: str,
    file_bytes: bytes,
    file_type: str,
    exam_types: list[str],
    subject: Optional[str],
    doc_type: str,
) -> None:
    """
    Ingestion pipeline (PageIndex):
      1. Extract page texts (digital PDF = free; scanned = Gemini Vision)
      2. Build PageIndex tree (LLM-powered hierarchical TOC with summaries)
      3. Store tree JSON + page_texts in knowledge_documents
      4. Update document status
    """
    from ..utils.supabase_client import get_supabase_service_client

    client = get_supabase_service_client()

    def _set_status(status: str, **extra):
        client.table("knowledge_documents").update(
            {"processing_status": status, **extra}
        ).eq("id", document_id).execute()

    try:
        _set_status("processing")

        # Get document title for image fallback
        doc_meta = client.table("knowledge_documents").select("title").eq(
            "id", document_id
        ).single().execute()
        doc_title = doc_meta.data.get("title", "Unknown") if doc_meta.data else "Unknown"

        # ── 1. Extract page texts ──────────────────────────────────────────
        logger.info("Extracting text", extra={"doc": document_id, "type": file_type})

        if file_type == "pdf":
            page_texts = extract_page_texts_pdf(file_bytes)
        elif file_type in ("jpg", "jpeg", "png", "webp"):
            mime = f"image/{'jpeg' if file_type == 'jpg' else file_type}"
            text = extract_text_from_image(file_bytes, mime)
            page_texts = [text] if text else []
        else:
            raise ValueError(f"Unsupported file type: {file_type}")

        if not page_texts or all(len(t.strip()) < 40 for t in page_texts):
            raise ValueError("No text could be extracted from this document.")

        page_count = len(page_texts)

        # ── 2. Build PageIndex tree ────────────────────────────────────────
        logger.info("Building PageIndex tree", extra={"doc": document_id, "pages": page_count})

        if file_type == "pdf" and page_count >= 2:
            tree = build_page_index(file_bytes)
        else:
            # Images / single-page docs: simple flat tree
            all_text = "\n".join(page_texts)
            tree = _build_image_tree(all_text, doc_title)

        if not tree or not tree.get("structure"):
            raise ValueError("PageIndex produced no structure.")

        # ── 3. Store in Postgres ───────────────────────────────────────────
        logger.info("Storing index", extra={"doc": document_id})

        _set_status(
            "completed",
            page_count=page_count,
            page_index_tree=tree,
            page_texts=page_texts,
            chunk_count=_count_nodes(tree.get("structure", [])),
        )
        logger.info("Document indexed", extra={
            "doc": document_id,
            "pages": page_count,
            "tree_nodes": _count_nodes(tree.get("structure", [])),
        })

    except Exception as exc:
        logger.error("Document processing failed",
                     extra={"doc": document_id, "error": str(exc)})
        _set_status("failed", error_message=str(exc)[:500])


def _count_nodes(structure) -> int:
    """Count total nodes in the tree."""
    if isinstance(structure, list):
        return sum(_count_nodes(n) for n in structure)
    if isinstance(structure, dict):
        count = 1
        if structure.get("nodes"):
            count += _count_nodes(structure["nodes"])
        return count
    return 0
