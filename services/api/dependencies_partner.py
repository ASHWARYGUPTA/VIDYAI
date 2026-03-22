"""
Partner API key authentication dependency.
Used by the MCP router and partner admin routes.
Key is NEVER logged — not even partially.

Supports two token types:
  - vida_live_* : permanent partner API key (server-to-server use only)
  - et_*        : short-lived embed token (browser-safe, 60-min TTL)
"""
import hashlib
import logging
from datetime import datetime, timezone
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from .utils.supabase_client import get_supabase_service_client

logger = logging.getLogger(__name__)
_bearer = HTTPBearer()


def _hash_key(raw_key: str) -> str:
    """SHA-256 hash of the raw API key for DB lookup."""
    return hashlib.sha256(raw_key.encode()).hexdigest()


async def _validate_embed_token(token: str, client) -> dict:
    """Validate a short-lived embed token (et_*) and return partner context."""
    token_hash = _hash_key(token)
    session = (
        client.table("embed_sessions")
        .select("id, partner_id, student_id, features, exam_type, expires_at")
        .eq("token_hash", token_hash)
        .maybe_single()
        .execute()
    )

    if not session.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "invalid_token", "code": "INVALID_EMBED_TOKEN"},
        )

    expires_at = session.data.get("expires_at")
    if expires_at:
        exp = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
        if exp < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error": "invalid_token", "code": "EMBED_TOKEN_EXPIRED"},
            )

    partner = (
        client.table("partner_organizations")
        .select("id, name, slug, tier, monthly_call_limit, calls_used_this_month, is_active, allowed_features")
        .eq("id", session.data["partner_id"])
        .single()
        .execute()
    )

    if not partner.data or not partner.data["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "partner_suspended", "code": "PARTNER_INACTIVE"},
        )

    # Embed tokens have feature-level scoping
    allowed = set(partner.data["allowed_features"] or [])
    scoped = set(session.data.get("features") or [])
    effective_features = list(allowed & scoped)

    return {
        "partner_id": partner.data["id"],
        "partner_name": partner.data["name"],
        "key_id": None,             # no API key row for embed tokens
        "tier": partner.data["tier"],
        "allowed_features": effective_features,
        "scopes": effective_features,
        "student_id": session.data["student_id"],  # set for embed sessions
        "exam_type": session.data.get("exam_type"),
        "token_type": "embed",
    }


async def get_partner(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
) -> dict:
    """
    Validate partner token and return partner context.
    Accepts both permanent API keys (vida_live_*) and embed tokens (et_*).
    Never log the raw token.
    """
    client = get_supabase_service_client()
    raw_token = credentials.credentials

    # Route: embed token (browser SDK) vs permanent API key (server-to-server)
    if raw_token.startswith("et_"):
        result = await _validate_embed_token(raw_token, client)
        result["token_type"] = "embed"
        return result

    key_hash = _hash_key(raw_token)

    key_row = (
        client.table("partner_api_keys")
        .select("id, partner_id, is_active, expires_at, scopes")
        .eq("key_hash", key_hash)
        .maybe_single()
        .execute()
    )

    if not key_row.data or not key_row.data["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "invalid_token", "code": "INVALID_API_KEY"},
        )

    from datetime import datetime
    if key_row.data.get("expires_at"):
        if datetime.fromisoformat(key_row.data["expires_at"]) < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error": "invalid_token", "code": "API_KEY_EXPIRED"},
            )

    partner = (
        client.table("partner_organizations")
        .select("id, name, slug, tier, monthly_call_limit, calls_used_this_month, is_active, allowed_features")
        .eq("id", key_row.data["partner_id"])
        .single()
        .execute()
    )

    if not partner.data or not partner.data["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "partner_suspended", "code": "PARTNER_INACTIVE"},
        )

    if partner.data["calls_used_this_month"] >= partner.data["monthly_call_limit"]:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"error": "rate_limit", "retry_after": 86400, "code": "MONTHLY_LIMIT_EXCEEDED"},
        )

    return {
        "partner_id": partner.data["id"],
        "partner_name": partner.data["name"],
        "key_id": key_row.data["id"],
        "tier": partner.data["tier"],
        "allowed_features": partner.data["allowed_features"],
        "scopes": key_row.data["scopes"],
        "student_id": None,   # not set for API key auth; set per MCP tool call
        "token_type": "api_key",
    }


CurrentPartner = Annotated[dict, Depends(get_partner)]
