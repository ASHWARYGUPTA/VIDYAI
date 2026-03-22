import logging
from datetime import datetime

logger = logging.getLogger(__name__)


def record_usage(
    partner_id: str,
    api_key_id: str,
    tool_name: str,
    latency_ms: int,
    tokens_used: int,
    status_code: int,
    error_message: str | None = None,
) -> None:
    """Insert one row into partner_api_usage and increment monthly counter."""
    from .supabase_client import get_supabase_service_client
    client = get_supabase_service_client()

    client.table("partner_api_usage").insert({
        "partner_id": partner_id,
        "api_key_id": api_key_id,
        "tool_name": tool_name,
        "called_at": datetime.utcnow().isoformat(),
        "latency_ms": latency_ms,
        "tokens_used": tokens_used,
        "status_code": status_code,
        "error_message": error_message,
    }).execute()

    # Increment monthly call counter — never raise, just log on failure
    try:
        client.rpc("increment_partner_calls", {"p_partner_id": partner_id}).execute()
    except Exception as e:
        logger.warning("Failed to increment partner call counter", extra={"partner_id": partner_id, "error": str(e)})

    # Update key last_used_at and total_calls
    try:
        client.table("partner_api_keys").update({
            "last_used_at": datetime.utcnow().isoformat(),
        }).eq("id", api_key_id).execute()
    except Exception:
        pass
