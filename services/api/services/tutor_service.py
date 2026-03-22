import uuid
import time
import logging
from typing import Any

from ..utils.supabase_client import get_supabase_service_client

logger = logging.getLogger(__name__)


async def answer_doubt(
    user_id: uuid.UUID,
    session_id: uuid.UUID,
    question: str,
    subject_id: uuid.UUID | None,
    chapter_id: uuid.UUID | None,
    language: str,
    parent_doubt_id: uuid.UUID | None,
) -> dict[str, Any]:
    start = time.time()
    client = get_supabase_service_client()

    # 1. Resolve subject name for filtering
    subject_name = None
    if subject_id:
        try:
            subj = client.table("subjects").select("name").eq("id", str(subject_id)).single().execute()
            if subj.data:
                subject_name = subj.data["name"]
        except Exception:
            pass

    # 2. PageIndex tree search — knowledge docs + user's lecture transcripts
    from .knowledge_service import search_knowledge
    chunks = await search_knowledge(
        query=question,
        subject=subject_name,
        user_id=str(user_id),
        limit=6,
    )
    logger.info(
        "RAG retrieval",
        extra={"chunks_retrieved": len(chunks), "question_len": len(question)},
    )

    # 3. Build RAG answer via Gemini
    answer, sources, follow_ups, tokens_used = await _call_llm(question, chunks, language)

    latency_ms = int((time.time() - start) * 1000)

    logger.info(
        "LLM call completed",
        extra={
            "model": "openrouter/google/gemma-3-4b-it:free",
            "tokens_used": tokens_used,
            "latency_ms": latency_ms,
            "endpoint": "tutor/ask",
            "user_id": str(user_id),
        },
    )

    # 4. Persist doubt_session
    doubt_row = client.table("doubt_sessions").insert({
        "user_id": str(user_id),
        "session_id": str(session_id),
        "question_text": question,
        "question_language": language,
        "subject_id": str(subject_id) if subject_id else None,
        "chapter_id": str(chapter_id) if chapter_id else None,
        "answer_text": answer,
        "answer_language": language,
        "sources": sources,
        "rag_chunks_used": len(chunks),
        "llm_model": "openrouter/google/gemma-3-4b-it:free",
        "tokens_used": tokens_used,
        "latency_ms": latency_ms,
        "parent_doubt_id": str(parent_doubt_id) if parent_doubt_id else None,
    }).execute()

    doubt_id = uuid.UUID(doubt_row.data[0]["id"])

    # 5. Log concept_interaction_event (skip — concept_id not available from RAG chunks)
    # concept_interaction_events requires a non-null concept_id; skip for now

    return {
        "doubt_id": doubt_id,
        "answer": answer,
        "answer_language": language,
        "sources": sources,
        "related_concepts": [],
        "follow_up_suggestions": follow_ups,
        "tokens_used": tokens_used,
        "latency_ms": latency_ms,
    }



async def _call_llm(
    question: str, chunks: list, language: str
) -> tuple[str, list, list[str], int]:
    """Call LLM via OpenRouter with RAG context. Degrades gracefully."""
    try:
        lang_instruction = {
            "hi": "Answer in Hindi.",
            "hinglish": "Answer in Hinglish (Hindi-English mix).",
            "en": "Answer in English.",
        }.get(language, "Answer in English.")

        system = (
            f"You are VidyAI, an expert tutor for JEE/NEET/UPSC students. {lang_instruction} "
            "Be concise, accurate, and always cite your sources using [SOURCE N] markers."
        )

        if chunks:
            context_blocks = []
            for i, c in enumerate(chunks, 1):
                title = c.get("doc_title", "Reference")
                doc_type = c.get("document_type", "")
                heading = c.get("section_heading", "")
                page_range = c.get("page_range", "")
                source_type = c.get("source_type", "document")

                if source_type == "lecture":
                    meta = f"[Lecture] {title}"
                    if heading and heading.lower() != "summary":
                        meta += f" › {heading}"
                else:
                    meta = f"{title}"
                    if doc_type:
                        meta += f" ({doc_type})"
                    if heading:
                        meta += f" › {heading}"
                    if page_range:
                        meta += f" pp.{page_range}"
                context_blocks.append(f"[SOURCE {i}: {meta}]\n{c.get('content', '')}")
            context_str = "\n\n---\n\n".join(context_blocks)
            user_message = (
                f"Use the following reference material to answer the question. "
                f"Cite each source you use with its [SOURCE N] tag.\n\n"
                f"{context_str}\n\n"
                f"---\n\nQuestion: {question}\n\n"
                f"Answer (cite sources, then suggest 2-3 follow-up questions at the end):"
            )
        else:
            user_message = (
                f"{question}\n\n"
                "(No reference material available — answer from general knowledge and "
                "note that the answer may not be specific to the student's syllabus.)"
            )

        logger.info(
            "Calling LLM",
            extra={"chunks": len(chunks), "language": language, "q_len": len(question)},
        )

        from ..utils.llm import get_llm
        from langchain_core.messages import SystemMessage, HumanMessage
        llm = get_llm(temperature=0.3, max_tokens=1024)
        response = await llm.ainvoke([
            SystemMessage(content=system),
            HumanMessage(content=user_message),
        ])

        answer = response.content or ""
        tokens = response.response_metadata.get("token_usage", {}).get("total_tokens", 0) if response.response_metadata else 0
        sources = [
            {
                "title":       c.get("doc_title", "Reference"),
                "chapter":     c.get("section_heading") or c.get("subject") or "",
                "page":        c.get("page_number"),
                "page_range":  c.get("page_range"),
                "source_type": c.get("source_type", "document"),
                "youtube_video_id": c.get("youtube_video_id"),
                "excerpt":     c.get("content", "")[:200],
            }
            for c in chunks
        ]
        follow_ups = _extract_follow_ups(answer)
        return answer, sources, follow_ups, tokens

    except Exception as e:
        logger.error("LLM call failed — returning fallback: %s", e, exc_info=True)
        return (
            "I'm unable to answer right now. Please try again in a moment.",
            [],
            [],
            0,
        )


def _extract_follow_ups(answer: str) -> list[str]:
    lines = answer.split("\n")
    suggestions = [l.strip("- •1234567890. ") for l in lines if "?" in l and len(l.strip()) > 10]
    return suggestions[:3]
