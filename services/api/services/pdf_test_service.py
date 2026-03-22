import json
import logging
import pymupdf

logger = logging.getLogger(__name__)

_EXTRACT_PROMPT = """You are a question paper parser. Extract ALL multiple-choice questions from the following text.

Return a JSON array. Each element MUST have exactly these keys:
{{
  "question_text": "the full question",
  "option_a": "text of option A",
  "option_b": "text of option B",
  "option_c": "text of option C",
  "option_d": "text of option D",
  "correct_option": "A" or "B" or "C" or "D",
  "explanation": "brief explanation or empty string"
}}

Rules:
- If correct answer is not shown in the paper, use your best judgment.
- Include ALL questions found, even if explanation is missing.
- Return ONLY the JSON array. No extra text, no markdown fences.

TEXT:
{text}"""


async def extract_mcqs_from_pdf(pdf_bytes: bytes) -> list[dict]:
    """Extract MCQs from PDF bytes using LLM. Returns list of question dicts."""
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    text = "".join(page.get_text() for page in doc)
    doc.close()

    if not text.strip():
        return []

    # Chunk into 12 000-char slices so large papers still get fully processed
    chunks = [text[i:i + 12000] for i in range(0, min(len(text), 48000), 12000)]

    from ..utils.llm import get_llm
    from langchain_core.messages import HumanMessage
    llm = get_llm(temperature=0, max_tokens=4096)

    all_questions: list[dict] = []
    for chunk in chunks:
        prompt = _EXTRACT_PROMPT.format(text=chunk)
        try:
            response = await llm.ainvoke([HumanMessage(content=prompt)])
            raw = response.content or ""
            # Strip thinking tokens
            if "<think>" in raw:
                end = raw.find("</think>")
                raw = raw[end + len("</think>"):] if end != -1 else raw
            # Extract JSON array
            start, end = raw.find("["), raw.rfind("]")
            if start != -1 and end != -1:
                raw = raw[start:end + 1]
            questions = json.loads(raw.strip())
            if isinstance(questions, list):
                all_questions.extend(questions)
        except Exception as e:
            logger.error("MCQ extraction chunk failed: %s", e)

    # Validate and normalise
    valid = []
    for q in all_questions:
        required = ["question_text", "option_a", "option_b", "option_c", "option_d", "correct_option"]
        if not all(k in q for k in required):
            continue
        q["correct_option"] = str(q["correct_option"]).upper().strip()
        if q["correct_option"] not in ("A", "B", "C", "D"):
            q["correct_option"] = "A"
        q.setdefault("explanation", "")
        valid.append(q)

    return valid


def analyze_frame_for_faces(jpeg_bytes: bytes) -> dict:
    """
    Use OpenCV Haar cascade to count faces in a JPEG frame.
    Returns {"face_count": int, "violations": [str]}.
    """
    try:
        import cv2
        import numpy as np
        arr = np.frombuffer(jpeg_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            return {"face_count": -1, "violations": []}
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))
        face_count = len(faces)
        violations = []
        if face_count == 0:
            violations.append("no_face")
        elif face_count > 1:
            violations.append("multiple_faces")
        return {"face_count": face_count, "violations": violations}
    except ImportError:
        # opencv not installed — skip vision check
        return {"face_count": -1, "violations": []}
    except Exception as e:
        logger.error("Frame analysis error: %s", e)
        return {"face_count": -1, "violations": []}
