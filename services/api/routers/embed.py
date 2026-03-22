"""
Embed Session API — /api/v1/embed
==================================
Server-to-server: partner backend exchanges a secret API key for a
short-lived, browser-safe embed token (et_*).

Flow:
  1. Partner backend calls POST /api/v1/embed/session (Bearer: vida_live_*)
  2. VidyAI returns { embed_token: "et_...", expires_at, features }
  3. Partner passes embed_token to their frontend page
  4. Frontend calls VidyAI.init({ embedToken }) — SDK stores it in memory
  5. Every MCP call from the browser uses the embed token as Bearer
  6. VidyAI validates embed token via embed_sessions table

Token security:
  - Raw token never stored — only SHA-256 hash persists
  - 60-minute TTL (configurable)
  - Scoped to partner + student + feature subset
  - If stolen, attacker can only call allowed features for that student for < 1 hour
"""
import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from ..dependencies_partner import CurrentPartner
from ..utils.supabase_client import get_supabase_service_client

logger = logging.getLogger(__name__)
router = APIRouter()

EMBED_TOKEN_TTL_MINUTES = 60

VALID_FEATURES = {"tutor", "retention", "planner", "mcq", "content", "knowledge"}


def _make_embed_token() -> tuple[str, str]:
    """Returns (raw_token, sha256_hash). Raw token has et_ prefix, never stored."""
    raw = f"et_{secrets.token_urlsafe(32)}"
    token_hash = hashlib.sha256(raw.encode()).hexdigest()
    return raw, token_hash


class CreateEmbedSessionRequest(BaseModel):
    student_id: str
    exam_type: str | None = None
    features: list[str] | None = None  # None = all partner-allowed features


@router.post("/session", status_code=status.HTTP_201_CREATED)
async def create_embed_session(body: CreateEmbedSessionRequest, partner: CurrentPartner):
    """
    Exchange a partner API key for a short-lived browser embed token.

    Call this **server-to-server** when a student opens your platform.
    Pass the returned `embed_token` to your frontend via cookie or JS variable.

    Example (Node.js partner backend):
        const res = await fetch('https://api.vidyai.in/api/v1/embed/session', {
            method: 'POST',
            headers: { Authorization: `Bearer ${VIDYAI_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: user.id, exam_type: 'JEE' })
        });
        const { embed_token } = await res.json();
        // Pass embed_token to your React/HTML page
    """
    allowed = set(partner["allowed_features"] or [])
    requested = set(body.features) if body.features else allowed
    features = list(requested & allowed & VALID_FEATURES)

    if not features:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "no_allowed_features", "code": "FEATURE_NOT_PERMITTED"},
        )

    raw_token, token_hash = _make_embed_token()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=EMBED_TOKEN_TTL_MINUTES)

    client = get_supabase_service_client()
    client.table("embed_sessions").insert({
        "token_hash": token_hash,
        "partner_id": partner["partner_id"],
        "student_id": body.student_id,
        "features": features,
        "exam_type": body.exam_type,
        "expires_at": expires_at.isoformat(),
    }).execute()

    logger.info("Embed session created", extra={
        "partner_id": partner["partner_id"],
        "student_id": body.student_id,
        "features": features,
    })

    return {
        "embed_token": raw_token,
        "expires_at": expires_at.isoformat(),
        "features": features,
        "student_id": body.student_id,
        "ttl_minutes": EMBED_TOKEN_TTL_MINUTES,
    }


@router.get("/session/validate")
async def validate_api_key(partner: CurrentPartner):
    """Health-check endpoint — confirms an API key is valid. Safe to call from partner backend."""
    return {
        "valid": True,
        "partner_id": partner["partner_id"],
        "partner_name": partner["partner_name"],
        "tier": partner["tier"],
        "allowed_features": partner["allowed_features"],
    }


@router.patch("/settings")
async def update_embed_settings(body: dict, partner: CurrentPartner):
    """Update partner embed settings: allowed_origins, webhook_url."""
    allowed_keys = {"allowed_origins", "webhook_url"}
    update = {k: v for k, v in body.items() if k in allowed_keys}
    if not update:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "no_valid_fields"},
        )

    client = get_supabase_service_client()
    client.table("partner_organizations").update(update).eq(
        "id", partner["partner_id"]
    ).execute()
    return {"updated": list(update.keys())}


@router.get("/settings")
async def get_embed_settings(partner: CurrentPartner):
    """Get current embed settings for this partner."""
    client = get_supabase_service_client()
    result = (
        client.table("partner_organizations")
        .select("allowed_origins, webhook_url, allowed_features, tier")
        .eq("id", partner["partner_id"])
        .single()
        .execute()
    )
    return result.data
