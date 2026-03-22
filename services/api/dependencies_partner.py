"""
Partner API key authentication dependency.
Used by the MCP router and partner admin routes.
Key is NEVER logged — not even partially.
"""
import hashlib
import logging
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from .utils.supabase_client import get_supabase_service_client

logger = logging.getLogger(__name__)
_bearer = HTTPBearer()


def _hash_key(raw_key: str) -> str:
    """SHA-256 hash of the raw API key for DB lookup."""
    return hashlib.sha256(raw_key.encode()).hexdigest()


async def get_partner(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
) -> dict:
    """
    Validate partner API key and return partner context.
    Never log the raw key.
    """
    client = get_supabase_service_client()
    key_hash = _hash_key(credentials.credentials)

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
    }


CurrentPartner = Annotated[dict, Depends(get_partner)]
