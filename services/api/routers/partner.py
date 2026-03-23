"""
Router 11 — Partner Admin /api/v1/partner
All routes require a valid partner session (partner admin JWT mapped to partner_organizations).
API keys are returned ONCE on creation, never stored in plaintext.
"""
import uuid
import secrets
import hashlib
import logging
from datetime import date, datetime
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel

from ..dependencies_partner import CurrentPartner
from ..utils.supabase_client import get_supabase_service_client

logger = logging.getLogger(__name__)
router = APIRouter()

KEY_PREFIX_LEN = 8  # e.g. "vida_live_ab12cd34"


def _generate_api_key() -> tuple[str, str, str]:
    """
    Returns (raw_key, key_prefix, key_hash).
    raw_key is shown ONCE to the user, never persisted.
    key_hash (SHA-256) is stored in the DB.
    """
    raw = f"vida_live_{secrets.token_urlsafe(24)}"
    prefix = raw[:18]
    key_hash = hashlib.sha256(raw.encode()).hexdigest()
    return raw, prefix, key_hash


class CreateKeyRequest(BaseModel):
    name: str
    scopes: list[str]
    expires_at: date | None = None


@router.post("/keys", status_code=status.HTTP_201_CREATED)
async def create_api_key(body: CreateKeyRequest, partner: CurrentPartner):
    client = get_supabase_service_client()
    raw_key, prefix, key_hash = _generate_api_key()

    result = client.table("partner_api_keys").insert({
        "partner_id": partner["partner_id"],
        "key_hash": key_hash,
        "key_prefix": prefix,
        "name": body.name,
        "is_active": True,
        "scopes": body.scopes,
        "expires_at": body.expires_at.isoformat() if body.expires_at else None,
    }).execute()

    key_id = result.data[0]["id"]
    logger.info("API key created", extra={"partner_id": partner["partner_id"], "key_id": key_id})

    # raw_key returned ONCE — never log it
    return {"api_key": raw_key, "key_prefix": prefix, "id": key_id}


@router.get("/keys")
async def list_api_keys(partner: CurrentPartner):
    client = get_supabase_service_client()
    result = (
        client.table("partner_api_keys")
        .select("id, key_prefix, name, is_active, last_used_at, total_calls, expires_at, scopes, created_at")
        .eq("partner_id", partner["partner_id"])
        .order("created_at", desc=True)
        .execute()
    )
    return {"keys": result.data}


@router.delete("/keys/{key_id}")
async def revoke_api_key(key_id: uuid.UUID, partner: CurrentPartner):
    client = get_supabase_service_client()
    existing = (
        client.table("partner_api_keys")
        .select("id")
        .eq("id", str(key_id))
        .eq("partner_id", partner["partner_id"])
        .maybe_single()
        .execute()
    )
    if existing is None or not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "not_found", "code": "KEY_NOT_FOUND"},
        )
    client.table("partner_api_keys").update({"is_active": False}).eq("id", str(key_id)).execute()
    logger.info("API key revoked", extra={"partner_id": partner["partner_id"], "key_id": str(key_id)})
    return {"revoked": True}


@router.get("/usage")
async def get_usage(
    partner: CurrentPartner,
    from_date: date = Query(alias="from", default=None),
    to_date: date = Query(alias="to", default=None),
    tool: str | None = Query(default=None),
):
    client = get_supabase_service_client()

    if not from_date:
        from_date = date.today().replace(day=1)
    if not to_date:
        to_date = date.today()

    query = (
        client.table("partner_api_usage")
        .select("tool_name, called_at, latency_ms, tokens_used, status_code")
        .eq("partner_id", partner["partner_id"])
        .gte("called_at", from_date.isoformat())
        .lte("called_at", to_date.isoformat())
    )
    if tool:
        query = query.eq("tool_name", tool)

    result = query.execute()
    rows = result.data or []

    total_calls = len(rows)
    tokens_used = sum(r.get("tokens_used") or 0 for r in rows)

    by_tool: dict[str, int] = {}
    by_day: dict[str, int] = {}
    for r in rows:
        t = r.get("tool_name", "unknown")
        by_tool[t] = by_tool.get(t, 0) + 1
        day = (r.get("called_at") or "")[:10]
        by_day[day] = by_day.get(day, 0) + 1

    return {
        "total_calls": total_calls,
        "by_tool": [{"tool": k, "count": v} for k, v in sorted(by_tool.items())],
        "by_day": [{"date": k, "count": v} for k, v in sorted(by_day.items())],
        "tokens_used": tokens_used,
    }


@router.get("/students")
async def list_students(
    partner: CurrentPartner,
    limit: int = Query(default=50, le=500),
    offset: int = Query(default=0, ge=0),
):
    client = get_supabase_service_client()
    result = (
        client.table("partner_student_mappings")
        .select("*", count="exact")
        .eq("partner_id", partner["partner_id"])
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return {"students": result.data, "total": result.count}
