import uuid
import json
import logging
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, status

from ..dependencies import CurrentUserID
from ..models.schemas import ProcessVideoRequest
from ..utils.supabase_client import get_supabase_service_client, ms
from ..config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/process", status_code=status.HTTP_202_ACCEPTED)
async def process_video(body: ProcessVideoRequest, background_tasks: BackgroundTasks, user_id: CurrentUserID):
    client = get_supabase_service_client()


    video_id_str = str(uuid.uuid4())
    job_id = str(uuid.uuid4())
    video_id_extracted = _extract_video_id(body.youtube_url)

    row = client.table("processed_videos").insert({
        "id": video_id_str,
        "user_id": str(user_id),
        "youtube_url": body.youtube_url,
        "youtube_video_id": video_id_extracted,
        "processing_status": "pending",
        "language_detected": body.output_language,
        "job_id": job_id,
    }).execute()

    video_id = row.data[0]["id"]
    background_tasks.add_task(_process_video_background, video_id, video_id_extracted, body.output_language)

    logger.info("Video enqueued", extra={"user_id": str(user_id), "video_id": video_id})
    return {"job_id": job_id, "status": "pending", "estimated_minutes": 1}


def _process_video_background(video_id: str, video_id_extracted: str, language: str):
    from datetime import datetime, timezone
    client = get_supabase_service_client()
    try:
        client.table("processed_videos").update({
            "processing_status": "processing",
            "processing_started_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", video_id).execute()

        # Step 1: Fetch transcript via youtube-transcript-api
        transcript_text, transcript_entries = _get_transcript(video_id_extracted)

        # Step 2: Extract fields using Gemini
        notes, summary, title = _extract_fields(transcript_text, language)

        # Build PageIndex tree from structured notes for lecture retrieval
        from ..services.knowledge_service import _build_video_index_tree
        video_tree, video_page_texts = _build_video_index_tree(title or "Lecture", summary, notes)

        client.table("processed_videos").update({
            "processing_status": "completed",
            "processing_completed_at": datetime.now(timezone.utc).isoformat(),
            "title": title,
            "transcript_raw": transcript_text,
            "structured_notes": notes,
            "summary": summary,
            "page_index_tree": video_tree,
            "page_texts": video_page_texts,
        }).eq("id", video_id).execute()

        logger.info("Video processed", extra={"video_id": video_id})

    except Exception as exc:
        import traceback
        logger.error("Video processing failed: %s\n%s", str(exc), traceback.format_exc())
        client.table("processed_videos").update({
            "processing_status": "failed",
            "error_message": str(exc),
        }).eq("id", video_id).execute()


def _get_transcript(video_id: str) -> tuple[str, list]:
    import os
    import requests
    from http.cookiejar import MozillaCookieJar
    from youtube_transcript_api import YouTubeTranscriptApi
    from youtube_transcript_api.proxies import GenericProxyConfig

    settings = get_settings()
    proxy_config = GenericProxyConfig(settings.youtube_proxy_url) if settings.youtube_proxy_url else None

    # Build a requests.Session with YouTube cookies if available
    session = requests.Session()
    cookies_file = settings.youtube_cookies_file
    if cookies_file and os.path.isfile(cookies_file):
        jar = MozillaCookieJar(cookies_file)
        try:
            jar.load(ignore_discard=True, ignore_expires=True)
            session.cookies = jar
            logger.info("Loaded %d cookies from %s", len(jar), cookies_file)
        except Exception as ce:
            logger.warning("Could not load cookies file: %s", ce)

    try:
        ytt = YouTubeTranscriptApi(proxy_config=proxy_config, http_client=session)
        try:
            fetched = ytt.fetch(video_id, languages=["en", "en-IN", "en-GB", "hi"])
        except Exception:
            # Fall back to first available language
            transcript_list = ytt.list(video_id)
            fetched = ytt.fetch(video_id, languages=[next(iter(transcript_list)).language_code])
        entries = [{"text": s.text, "start": s.start, "duration": s.duration} for s in fetched]
        text = " ".join(e["text"] for e in entries)
        return text, entries
    except Exception as e:
        err_str = str(e)
        logger.warning("youtube-transcript-api failed (%s: %s), trying yt-dlp fallback", type(e).__name__, err_str[:100])
        # Try yt-dlp for any failure — it handles bot detection, age gates, etc.
        try:
            return _get_transcript_ytdlp(video_id)
        except ValueError:
            pass
        raise ValueError("NO_TRANSCRIPT")


def _get_transcript_ytdlp(video_id: str) -> tuple[str, list]:
    """Fallback transcript extraction via yt-dlp using cookies.txt."""
    import os
    import json
    import tempfile
    import subprocess
    settings = get_settings()
    cookies_file = settings.youtube_cookies_file
    url = f"https://www.youtube.com/watch?v={video_id}"

    # Prefer the venv's yt-dlp (newer version) over any system-installed one
    import shutil
    venv_ytdlp = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                              "venv", "bin", "yt-dlp")
    ytdlp_bin = venv_ytdlp if os.path.isfile(venv_ytdlp) else shutil.which("yt-dlp") or "yt-dlp"

    with tempfile.TemporaryDirectory() as tmpdir:
        cmd = [
            ytdlp_bin,
            "--no-update",
            "--write-auto-sub",
            "--sub-lang", "en",
            "--skip-download",
            "--sub-format", "json3",
            "-o", os.path.join(tmpdir, "%(id)s"),
        ]
        if cookies_file and os.path.isfile(cookies_file):
            cmd += ["--cookies", cookies_file]
        cmd.append(url)

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if result.returncode != 0:
            logger.warning("yt-dlp failed (rc=%d): %s", result.returncode, result.stderr[-300:])
            raise ValueError("NO_TRANSCRIPT")

        # Find the downloaded .json3 subtitle file
        for fname in os.listdir(tmpdir):
            if fname.endswith(".json3"):
                with open(os.path.join(tmpdir, fname)) as f:
                    data = json.load(f)
                entries = []
                for event in data.get("events", []):
                    segs = event.get("segs")
                    if not segs:
                        continue
                    text = "".join(s.get("utf8", "") for s in segs).strip()
                    if text:
                        entries.append({
                            "text": text,
                            "start": event.get("tStartMs", 0) / 1000,
                            "duration": event.get("dDurationMs", 0) / 1000,
                        })
                text = " ".join(e["text"] for e in entries)
                return text, entries

    raise ValueError("NO_TRANSCRIPT")


_CHUNK_WORDS = 1200  # words per map chunk (used only when Gemini unavailable)
_MAP_WORKERS = 8     # parallel OpenRouter calls (used only when Gemini unavailable)

# Max words sent to Gemini in a single call (~750K token context, well within limits)
_GEMINI_MAX_WORDS = 80_000


def _chunk_transcript(text: str, chunk_words: int = _CHUNK_WORDS) -> list[str]:
    words = text.split()
    return [" ".join(words[i: i + chunk_words]) for i in range(0, len(words), chunk_words)]


_NOTES_SYSTEM = """\
You are an expert study-notes creator for JEE/NEET/UPSC students.
Convert the lecture content into **Obsidian-flavoured Markdown** notes.

Rules:
- Use **topic-based headings** (## Concept Name) — never "Part 1", "Part 2", "Section 1"
- Add a Mermaid diagram where it helps visualise relationships or a process (flowchart TD or mindmap)
- Use > [!NOTE], > [!TIP], > [!IMPORTANT] callout blocks for key facts
- Use **bold** for key terms, `code` for formulas/values
- Use [[WikiLinks]] for concepts that relate to each other
- Tables for comparisons (at least one table if applicable)
- Maximum 600 words total. Be dense and precise — no filler.
- Return ONLY valid JSON (no markdown fences around the JSON itself):
{"title":"concise video title","summary":"3-4 sentence executive summary","notes":"<full obsidian markdown string>","key_concepts":["concept1","concept2"]}
"""


def _parse_llm_json(raw: str) -> dict:
    """Extract the first JSON object from an LLM response string."""
    raw = (raw or "").strip()
    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object found in LLM response")
    return json.loads(raw[start:end + 1])


def _single_call(transcript_text: str, llm) -> dict:
    """Single LLM call — used for both Gemini fast path and short OpenRouter transcripts."""
    from langchain_core.messages import HumanMessage
    prompt = f"{_NOTES_SYSTEM}\n\nTranscript:\n{transcript_text}"
    response = llm.invoke([HumanMessage(content=prompt)])
    return _parse_llm_json(response.content or "")


def _map_chunk(chunk: str, model: str) -> str:
    """Extract a compact bullet-point summary from one chunk (OpenRouter fallback)."""
    from ..utils.llm import get_llm
    from langchain_core.messages import HumanMessage
    prompt = (
        "Extract ONLY the key academic facts from this transcript excerpt as a tight bullet list "
        "(max 8 bullets, each ≤ 20 words). Skip filler, greetings, ads. Plain text only.\n\n"
        f"Excerpt:\n{chunk}"
    )
    try:
        llm = get_llm(model=model, temperature=0.1, max_tokens=400)
        response = llm.invoke([HumanMessage(content=prompt)])
        return (response.content or "").strip()
    except Exception:
        return ""


def _reduce_summaries(bullet_blocks: list[str], model: str) -> dict:
    """Merge all mapped bullet blocks into structured Markdown notes (OpenRouter fallback)."""
    from ..utils.llm import get_llm
    from langchain_core.messages import HumanMessage
    combined = "\n---\n".join(b for b in bullet_blocks if b)
    prompt = (
        f"{_NOTES_SYSTEM}\n\n"
        "Key points extracted from the lecture:\n"
        f"{combined}"
    )
    try:
        llm = get_llm(model=model, temperature=0.2, max_tokens=2048)
        response = llm.invoke([HumanMessage(content=prompt)])
        return _parse_llm_json(response.content or "")
    except Exception:
        return {}


def _extract_fields(transcript: str, language: str) -> tuple[str, str, str]:
    if not transcript:
        return "", "", "Untitled"

    from ..utils.llm import get_gemini_llm

    words = transcript.split()

    # ── Fast path: single Gemini call (handles any video length in one shot) ──
    gemini = get_gemini_llm(model="gemini-1.5-flash", temperature=0.2, max_tokens=2048)
    if gemini:
        try:
            # Truncate only if absurdly long (>80K words ≈ 5+ hour video)
            text_to_use = " ".join(words[:_GEMINI_MAX_WORDS]) if len(words) > _GEMINI_MAX_WORDS else transcript
            data = _single_call(text_to_use, gemini)
            notes = data.get("notes", "")
            logger.info("Gemini single-call succeeded: title=%r", data.get("title"))
            return notes, data.get("summary", ""), data.get("title", "Untitled")
        except Exception as e:
            logger.warning("Gemini fast path failed (%s), falling back to OpenRouter map-reduce", e)

    # ── Slow path: OpenRouter map-reduce (no Gemini key or Gemini failed) ──
    try:
        from concurrent.futures import ThreadPoolExecutor, as_completed

        model = None  # uses LLM_MODEL from env

        # Short transcripts: single OpenRouter call
        if len(words) <= _CHUNK_WORDS:
            from ..utils.llm import get_llm
            llm = get_llm(model=model, temperature=0.2, max_tokens=2048)
            data = _single_call(transcript[:8000], llm)
            notes = data.get("notes", "")
            return notes, data.get("summary", ""), data.get("title", "Untitled")

        # Long transcripts: MAP-REDUCE in parallel
        chunks = _chunk_transcript(transcript, _CHUNK_WORDS)
        bullet_blocks: list[str] = [""] * len(chunks)
        with ThreadPoolExecutor(max_workers=_MAP_WORKERS) as executor:
            futures = {executor.submit(_map_chunk, chunk, model): i for i, chunk in enumerate(chunks)}
            for future in as_completed(futures):
                idx = futures[future]
                try:
                    bullet_blocks[idx] = future.result()
                except Exception:
                    bullet_blocks[idx] = ""

        data = _reduce_summaries(bullet_blocks, model)
        if not data:
            return _fallback_extract(transcript)

        notes = data.get("notes", "")
        return notes, data.get("summary", ""), data.get("title", "Untitled")

    except Exception as e:
        logger.warning("OpenRouter map-reduce failed (%s), using no-AI fallback", e)
        return _fallback_extract(transcript)


def _fallback_extract(transcript: str) -> tuple[str, str, str]:
    """No-AI fallback: split transcript into sections as plain Markdown notes."""
    summary = transcript[:300].strip()
    words = transcript.split()
    chunk_size = max(100, len(words) // 5)
    parts = [
        f"## Part {i+1}\n\n" + " ".join(words[i * chunk_size:(i + 1) * chunk_size])
        for i in range(min(5, max(1, len(words) // chunk_size)))
    ]
    notes = "\n\n".join(parts)
    return notes, summary, "Processed Video"


def _extract_video_id(url: str) -> str:
    import re
    patterns = [
        r"youtu\.be/([^?&]+)",
        r"youtube\.com/watch\?v=([^&]+)",
        r"youtube\.com/embed/([^?&]+)",
        r"youtube\.com/shorts/([^?&]+)",
    ]
    for p in patterns:
        m = re.search(p, url)
        if m:
            return m.group(1)
    return url


def _status_to_progress(status: str) -> int:
    return {"pending": 5, "processing": 50, "completed": 100, "failed": 0}.get(status, 0)


@router.get("/status/{job_id}")
async def get_status(job_id: str, user_id: CurrentUserID):
    client = get_supabase_service_client()
    result = ms(client.table("processed_videos").select("*").eq("job_id", job_id).eq("user_id", str(user_id)))
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": "not_found", "code": "JOB_NOT_FOUND"})

    row = result.data
    return {
        "job_id": job_id,
        "status": row["processing_status"],
        "progress_percent": _status_to_progress(row["processing_status"]),
        "stage": row["processing_status"],
        "result": row if row["processing_status"] == "completed" else None,
        "error": row.get("error_message"),
    }


@router.get("/videos")
async def list_videos(
    user_id: CurrentUserID,
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0, ge=0),
    status: str | None = Query(default=None),
):
    client = get_supabase_service_client()
    query = (
        client.table("processed_videos")
        .select("*", count="exact")
        .eq("user_id", str(user_id))
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
    )
    if status:
        query = query.eq("processing_status", status)
    result = query.execute()
    return {"videos": result.data, "total": result.count}


@router.get("/video/{video_id}")
async def get_video(video_id: uuid.UUID, user_id: CurrentUserID):
    client = get_supabase_service_client()
    result = ms(client.table("processed_videos").select("*").eq("id", str(video_id)).eq("user_id", str(user_id)))
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": "not_found", "code": "VIDEO_NOT_FOUND"})
    return {"video": result.data}


@router.delete("/video/{video_id}")
async def delete_video(video_id: uuid.UUID, user_id: CurrentUserID):
    client = get_supabase_service_client()
    client.table("processed_videos").delete().eq("id", str(video_id)).eq("user_id", str(user_id)).execute()
    return {"deleted": True}
