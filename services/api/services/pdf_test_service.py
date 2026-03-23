import json
import base64
import logging
import pymupdf

logger = logging.getLogger(__name__)

_EXTRACT_PROMPT = """You are an expert question paper parser for Indian competitive exams (JEE/NEET/UPSC).
Extract ALL multiple-choice questions (MCQ / Section A type) visible in this image.

Return a JSON array. Each element MUST have exactly these keys:
{
  "question_text": "...",
  "option_a": "...",
  "option_b": "...",
  "option_c": "...",
  "option_d": "...",
  "correct_option": "A" or "B" or "C" or "D",
  "explanation": "..."
}

MATHEMATICS / EQUATIONS — very important:
- Write ALL mathematical expressions in inline LaTeX: wrap with $...$ e.g. $x^2 + y^2 = r^2$
- Use $\\frac{a}{b}$ for fractions, $\\sqrt{x}$ for roots, $\\int_a^b$, $\\sum_{k=1}^{n}$, $\\vec{a}$, $\\hat{i}$
- Subscripts: $x_1$, superscripts: $x^2$, Greek: $\\alpha$, $\\beta$, $\\theta$, $\\pi$
- Matrices: use $\\begin{bmatrix}...\\end{bmatrix}$
- Do NOT use plain text like "x^2" outside of $...$

EXTRACTION RULES:
- Extract ONLY questions with exactly 4 options (MCQ). Skip Section B / integer-answer questions.
- Options labeled 1/2/3/4 → map to A/B/C/D in your output.
- If correct answer is not visible, use your subject knowledge to determine it.
- Preserve full question context including "If ... then ...", given conditions, and units.
- Return ONLY the JSON array. No markdown fences, no prose outside the array."""


def _page_to_b64_png(page: pymupdf.Page, zoom: float = 2.0) -> str:
    """Render a PDF page to a base64-encoded PNG at the given zoom level."""
    mat = pymupdf.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat, colorspace=pymupdf.csRGB)
    png_bytes = pix.tobytes("png")
    return base64.b64encode(png_bytes).decode()


def _parse_json_questions(raw: str) -> list[dict]:
    """Find the first JSON array in raw and parse it. Returns [] on failure."""
    start = raw.find("[")
    end = raw.rfind("]")
    if start == -1 or end == -1 or end <= start:
        return []
    try:
        result = json.loads(raw[start:end + 1])
        return result if isinstance(result, list) else []
    except json.JSONDecodeError:
        return []


async def extract_mcqs_from_pdf(pdf_bytes: bytes) -> list[dict]:
    """
    Extract MCQs from PDF bytes.
    Strategy: render each page as a PNG and send to a vision LLM.
    Falls back to text-only extraction for text-based PDFs.
    """
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")

    # Decide whether to use vision.
    # JEE/NEET PDFs often have machine-readable metadata (IDs, labels) but the
    # actual question content is in embedded images. Require > 300 chars of
    # "real" content per page on average before trusting text extraction.
    sample_text = "".join(page.get_text() for page in doc[:5])
    avg_chars_per_page = len(sample_text.strip()) / max(min(len(doc), 5), 1)
    use_vision = avg_chars_per_page < 300
    logger.info("PDF: %d pages, %.0f avg chars/page → %s extraction",
                len(doc), avg_chars_per_page, "VISION" if use_vision else "TEXT")

    from ..config import get_settings
    from ..utils.llm import get_llm
    from langchain_core.messages import HumanMessage

    settings = get_settings()

    all_questions: list[dict] = []

    if use_vision:
        # Vision path: render each page and send to vision model
        vision_llm = get_llm(
            model=settings.vision_model,
            temperature=0,
            max_tokens=4096,
        )
        for page_num, page in enumerate(doc):
            try:
                b64_png = _page_to_b64_png(page)
                msg = HumanMessage(content=[
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{b64_png}"},
                    },
                    {"type": "text", "text": _EXTRACT_PROMPT},
                ])
                response = await vision_llm.ainvoke([msg])
                raw = response.content or ""
                questions = _parse_json_questions(raw)
                all_questions.extend(questions)
                logger.info("Page %d: extracted %d questions", page_num + 1, len(questions))
            except Exception as e:
                logger.error("Vision extraction failed page %d: %s", page_num + 1, e)
    else:
        # Text path: chunk text and send to standard LLM
        text = "".join(page.get_text() for page in doc)
        chunks = [text[i:i + 12000] for i in range(0, min(len(text), 60000), 12000)]
        text_llm = get_llm(temperature=0, max_tokens=4096)

        for chunk in chunks:
            try:
                # Use concatenation — _EXTRACT_PROMPT contains literal {} for the
                # JSON schema example so .format() would throw KeyError.
                prompt_text = _EXTRACT_PROMPT + "\n\nTEXT:\n" + chunk
                response = await text_llm.ainvoke(
                    [HumanMessage(content=prompt_text)]
                )
                raw = response.content or ""
                questions = _parse_json_questions(raw)
                all_questions.extend(questions)
            except Exception as e:
                logger.error("Text extraction chunk failed: %s", e)

    doc.close()

    # Validate and normalise
    valid = []
    seen: set[str] = set()
    for q in all_questions:
        required = ["question_text", "option_a", "option_b", "option_c", "option_d", "correct_option"]
        if not all(k in q for k in required):
            continue
        # Normalise correct_option: 1→A, 2→B, 3→C, 4→D
        co = str(q["correct_option"]).strip().upper()
        co = {"1": "A", "2": "B", "3": "C", "4": "D"}.get(co, co)
        if co not in ("A", "B", "C", "D"):
            co = "A"
        q["correct_option"] = co
        q.setdefault("explanation", "")
        # Deduplicate by question text
        key = q["question_text"][:80]
        if key in seen:
            continue
        seen.add(key)
        valid.append(q)

    logger.info("Total valid MCQs extracted: %d", len(valid))
    return valid


def analyze_frame_for_faces(jpeg_bytes: bytes) -> dict:
    """
    Analyze a JPEG webcam frame for proctoring violations.
    Delegates to the proctoring module (DNN face detector + gaze estimation).
    Returns {"face_count": int, "violations": list[str]}.
    """
    from ..utils.proctoring import analyze_frame
    result = analyze_frame(jpeg_bytes)
    return {"face_count": result["face_count"], "violations": result["violations"]}
