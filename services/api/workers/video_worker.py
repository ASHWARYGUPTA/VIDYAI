import logging
from ..workers.celery_app import celery_app
from ..utils.supabase_client import get_supabase_service_client

logger = logging.getLogger(__name__)


@celery_app.task(name="workers.video_worker.process_video_task", bind=True, max_retries=3)
def process_video_task(self, video_id: str, output_language: str, generate_dub: bool):
    client = get_supabase_service_client()
    try:
        client.table("processed_videos").update({"processing_status": "processing", "processing_started_at": "now()"}).eq("id", video_id).execute()

        row = client.table("processed_videos").select("youtube_url, youtube_video_id").eq("id", video_id).single().execute()
        youtube_video_id = row.data["youtube_video_id"]

        # Stage 1: Fetch transcript via youtube-transcript-api
        transcript = _fetch_transcript(youtube_video_id)

        # Stage 2: Generate structured notes via Gemini
        notes, summary = _generate_notes(transcript, output_language)

        client.table("processed_videos").update({
            "processing_status": "completed",
            "transcript_raw": transcript,
            "structured_notes": notes,
            "summary": summary,
            "processing_completed_at": "now()",
        }).eq("id", video_id).execute()

        logger.info("Video processed", extra={"video_id": video_id})

    except Exception as exc:
        logger.error("Video processing failed", extra={"video_id": video_id, "error": str(exc)})
        client.table("processed_videos").update({"processing_status": "failed", "error_message": str(exc)}).eq("id", video_id).execute()
        raise self.retry(exc=exc, countdown=60)


def _fetch_transcript(video_id: str) -> str:
    from youtube_transcript_api import YouTubeTranscriptApi
    try:
        ytt = YouTubeTranscriptApi()
        try:
            fetched = ytt.fetch(video_id, languages=["en", "en-IN", "en-GB", "hi"])
        except Exception:
            transcript_list = ytt.list(video_id)
            fetched = transcript_list[0].fetch()
        entries = fetched.to_raw_data()
        return " ".join(e["text"] for e in entries)
    except Exception as e:
        logger.warning("Transcript fetch failed", extra={"error": str(e)})
        return ""


def _generate_notes(transcript: str, language: str) -> tuple[list, str]:
    """Generate structured notes from transcript via OpenRouter."""
    if not transcript:
        return [], ""
    try:
        import json
        from ..utils.llm import get_llm
        from langchain_core.messages import HumanMessage

        llm = get_llm(temperature=0.2, max_tokens=1024)
        response = llm.invoke([HumanMessage(content=(
            "Extract structured notes from this lecture transcript for JEE/NEET/UPSC students.\n"
            f'Return ONLY valid JSON: {{"notes": [{{"heading": "str", "content": "str"}}], "summary": "str"}}\n'
            f"Language: {language}\n"
            f"Transcript: {transcript[:8000]}"
        ))])
        logger.info("Notes LLM call", extra={"model": "google/gemma-3-4b-it:free", "tokens_used": 0, "latency_ms": 0, "endpoint": "video_worker/notes", "user_id": "system"})
        raw = response.content or ""
        if "```" in raw:
            raw = raw[raw.find("{"):raw.rfind("}") + 1]
        data = json.loads(raw)
        return data.get("notes", []), data.get("summary", "")
    except Exception as e:
        logger.warning("Notes generation failed", extra={"error": str(e)})
        return [], ""


def _dub_video(youtube_url: str, language: str) -> str | None:
    # Sarvam AI TTS dubbing — placeholder
    return None
