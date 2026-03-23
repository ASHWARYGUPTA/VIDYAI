"""
Proctoring utility — face detection and gaze analysis for exam monitoring.

Inspired by vardanagarwal/Proctoring-AI (MIT).
Uses OpenCV DNN SSD ResNet10 face detector (better accuracy at angles / low light
than the Haar cascade previously used), plus Haar-based eye detection for
gaze/pose estimation.

Detection pipeline (runs on each webcam frame sent from the browser):
  1. Decode JPEG → BGR image
  2. Detect faces via DNN (fallback: Haar frontal + profile)
  3. For each frontal face, detect eyes in the face ROI
  4. If no eyes visible in a detected face → estimate head is turned away
  5. Aggregate violations: no_face | multiple_faces | looking_away
"""
from __future__ import annotations

import logging
import os
import threading
import urllib.request
from pathlib import Path

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# ── Model cache dir ───────────────────────────────────────────────────────────
_MODEL_DIR = Path("/tmp/vidyai_models")
_MODEL_DIR.mkdir(exist_ok=True)

_PROTO_PATH  = _MODEL_DIR / "deploy.prototxt"
_MODEL_PATH  = _MODEL_DIR / "res10_300x300_ssd_fp16.caffemodel"

# OpenCV GitHub raw URLs for the SSD ResNet10 face detector
# (same model used by Proctoring-AI but accessed directly from OpenCV samples)
_PROTO_URL = (
    "https://raw.githubusercontent.com/opencv/opencv/"
    "master/samples/dnn/face_detector/deploy.prototxt"
)
_MODEL_URL = (
    "https://github.com/opencv/opencv_3rdparty/raw/"
    "dnn_samples_face_detector_20180205_fp16/"
    "res10_300x300_ssd_iter_140000_fp16.caffemodel"
)

# Module-level singletons
_dnn_net: cv2.dnn.Net | None = None
_dnn_lock = threading.Lock()
_haar_face_frontal: cv2.CascadeClassifier | None = None
_haar_face_profile: cv2.CascadeClassifier | None = None
_haar_eye: cv2.CascadeClassifier | None = None


# ── Haar cascade loaders (always available) ───────────────────────────────────

def _get_haar_frontal() -> cv2.CascadeClassifier:
    global _haar_face_frontal
    if _haar_face_frontal is None:
        _haar_face_frontal = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
    return _haar_face_frontal


def _get_haar_profile() -> cv2.CascadeClassifier:
    global _haar_face_profile
    if _haar_face_profile is None:
        _haar_face_profile = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_profileface.xml"
        )
    return _haar_face_profile


def _get_haar_eye() -> cv2.CascadeClassifier:
    global _haar_eye
    if _haar_eye is None:
        _haar_eye = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_eye.xml"
        )
    return _haar_eye


# ── DNN face detector ─────────────────────────────────────────────────────────

def _download_model_file(url: str, dest: Path) -> bool:
    """Download a file if not already cached. Returns True on success."""
    if dest.exists() and dest.stat().st_size > 1024:
        return True
    try:
        logger.info("Downloading proctoring model: %s", dest.name)
        urllib.request.urlretrieve(url, dest)
        logger.info("Downloaded %s (%.1f KB)", dest.name, dest.stat().st_size / 1024)
        return True
    except Exception as exc:
        logger.warning("Could not download %s: %s", dest.name, exc)
        return False


def _get_dnn_net() -> cv2.dnn.Net | None:
    """Return the singleton DNN net, downloading models on first call."""
    global _dnn_net
    if _dnn_net is not None:
        return _dnn_net
    with _dnn_lock:
        if _dnn_net is not None:
            return _dnn_net
        proto_ok  = _download_model_file(_PROTO_URL,  _PROTO_PATH)
        model_ok  = _download_model_file(_MODEL_URL,  _MODEL_PATH)
        if proto_ok and model_ok:
            try:
                net = cv2.dnn.readNetFromCaffe(str(_PROTO_PATH), str(_MODEL_PATH))
                _dnn_net = net
                logger.info("DNN face detector loaded (SSD ResNet10 FP16)")
            except Exception as exc:
                logger.warning("Could not load DNN face detector: %s", exc)
        else:
            logger.info("DNN model unavailable — will use Haar cascade fallback")
    return _dnn_net


# ── Face detection ────────────────────────────────────────────────────────────

def _detect_faces_dnn(img: np.ndarray, conf_thresh: float = 0.5) -> list[tuple[int, int, int, int]]:
    """Detect faces using the DNN SSD detector. Returns list of (x, y, w, h)."""
    net = _get_dnn_net()
    if net is None:
        return []
    h, w = img.shape[:2]
    blob = cv2.dnn.blobFromImage(
        cv2.resize(img, (300, 300)), 1.0, (300, 300),
        (104.0, 177.0, 123.0), swapRB=False, crop=False,
    )
    net.setInput(blob)
    detections = net.forward()

    faces: list[tuple[int, int, int, int]] = []
    for i in range(detections.shape[2]):
        conf = float(detections[0, 0, i, 2])
        if conf < conf_thresh:
            continue
        x1 = int(detections[0, 0, i, 3] * w)
        y1 = int(detections[0, 0, i, 4] * h)
        x2 = int(detections[0, 0, i, 5] * w)
        y2 = int(detections[0, 0, i, 6] * h)
        # Clamp to image bounds
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        fw, fh = x2 - x1, y2 - y1
        if fw > 20 and fh > 20:
            faces.append((x1, y1, fw, fh))
    return faces


def _detect_faces_haar(gray: np.ndarray) -> tuple[list, list]:
    """Fallback Haar detection: returns (frontal_faces, profile_faces)."""
    frontal = list(_get_haar_frontal().detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60)
    ))
    profile = list(_get_haar_profile().detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60)
    ))
    return frontal, profile


# ── Gaze / head-pose estimation ───────────────────────────────────────────────

def _is_looking_away(img: np.ndarray, face_rect: tuple[int, int, int, int]) -> bool:
    """
    Estimate if the candidate is looking away from the screen.

    Strategy (from Proctoring-AI concept):
    - Crop the face ROI.
    - Run eye detection (Haar) within the upper half of the face.
    - If no eyes are visible inside a detected face the candidate is likely
      turned sideways or looking down.
    - Also checks face width-to-height ratio: a very narrow face box signals
      a profile/side view even when the DNN detector catches it.
    """
    x, y, w, h = face_rect
    # A strongly compressed width (< 55% of height) suggests profile view
    if w < h * 0.55:
        return True

    # Crop upper half of the face (eye region)
    eye_roi_y1 = y + int(h * 0.15)
    eye_roi_y2 = y + int(h * 0.60)
    eye_roi_x1 = max(0, x)
    eye_roi_x2 = min(img.shape[1], x + w)
    eye_roi = img[eye_roi_y1:eye_roi_y2, eye_roi_x1:eye_roi_x2]

    if eye_roi.size == 0:
        return False

    gray_roi = cv2.cvtColor(eye_roi, cv2.COLOR_BGR2GRAY) if len(eye_roi.shape) == 3 else eye_roi
    eyes = _get_haar_eye().detectMultiScale(
        gray_roi, scaleFactor=1.1, minNeighbors=4, minSize=(20, 20)
    )
    # Expect 1–2 eyes in a forward-facing face; 0 eyes → looking away
    return len(eyes) == 0


# ── Public API ────────────────────────────────────────────────────────────────

def analyze_frame(jpeg_bytes: bytes) -> dict:
    """
    Full proctoring analysis of a single JPEG webcam frame.

    Returns:
        {
            "face_count": int,
            "violations": list[str],   # subset of: no_face, multiple_faces, looking_away
            "details": dict,
        }
    """
    try:
        arr = np.frombuffer(jpeg_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            return {"face_count": -1, "violations": [], "details": {"error": "decode_failed"}}

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # ── 1. Detect faces (DNN preferred, Haar fallback) ────────────────────
        faces = _detect_faces_dnn(img)
        used_dnn = bool(faces) or _get_dnn_net() is not None

        if not used_dnn or not faces:
            # Haar fallback: combine frontal + profile
            frontal, profile = _detect_faces_haar(gray)
            # Deduplicate frontal and profile (profile often overlaps with frontal)
            if frontal:
                faces = [(int(x), int(y), int(w), int(h)) for x, y, w, h in frontal]
            elif profile:
                faces = [(int(x), int(y), int(w), int(h)) for x, y, w, h in profile]
            else:
                faces = []

        face_count = len(faces)
        violations: list[str] = []

        # ── 2. Violation: no face ─────────────────────────────────────────────
        if face_count == 0:
            violations.append("no_face")
            return {"face_count": 0, "violations": violations, "details": {}}

        # ── 3. Violation: multiple faces ──────────────────────────────────────
        if face_count > 1:
            violations.append("multiple_faces")

        # ── 4. Violation: looking away (head pose via eye detection) ──────────
        # Check the largest face (primary candidate)
        primary = max(faces, key=lambda r: r[2] * r[3])
        if _is_looking_away(img, primary):
            violations.append("looking_away")

        return {
            "face_count": face_count,
            "violations": violations,
            "details": {"face_rects": faces},
        }

    except ImportError:
        return {"face_count": -1, "violations": [], "details": {"error": "cv2_not_installed"}}
    except Exception as exc:
        logger.error("Proctoring frame analysis error: %s", exc)
        return {"face_count": -1, "violations": [], "details": {"error": str(exc)}}
