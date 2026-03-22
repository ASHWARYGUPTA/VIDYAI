import uuid
import logging
from fastapi import APIRouter, Query
from ..dependencies import CurrentUserID
from ..utils.supabase_client import get_supabase_service_client, ms

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("")
async def list_notifications(
    user_id: CurrentUserID,
    unread_only: bool = Query(default=False),
    limit: int = Query(default=20, le=100),
):
    client = get_supabase_service_client()
    query = client.table("notifications").select("*", count="exact").eq("user_id", str(user_id)).order("created_at", desc=True).limit(limit)
    if unread_only:
        query = query.eq("is_read", False)
    result = query.execute()
    unread = client.table("notifications").select("id", count="exact").eq("user_id", str(user_id)).eq("is_read", False).execute()
    return {"notifications": result.data, "unread_count": unread.count or 0}


@router.patch("/{notification_id}/read")
async def mark_read(notification_id: uuid.UUID, user_id: CurrentUserID):
    from datetime import datetime
    client = get_supabase_service_client()
    client.table("notifications").update({"is_read": True, "read_at": datetime.utcnow().isoformat()}).eq("id", str(notification_id)).eq("user_id", str(user_id)).execute()
    return {"success": True}


@router.patch("/read-all")
async def mark_all_read(user_id: CurrentUserID):
    from datetime import datetime
    client = get_supabase_service_client()
    result = client.table("notifications").update({"is_read": True, "read_at": datetime.utcnow().isoformat()}).eq("user_id", str(user_id)).eq("is_read", False).execute()
    return {"updated": len(result.data) if result.data else 0}


@router.get("/preferences")
async def get_preferences(user_id: CurrentUserID):
    client = get_supabase_service_client()
    result = ms(client.table("notification_preferences").select("*").eq("user_id", str(user_id)))
    return {"preferences": result.data}


@router.patch("/preferences")
async def update_preferences(body: dict, user_id: CurrentUserID):
    client = get_supabase_service_client()
    result = client.table("notification_preferences").upsert({"user_id": str(user_id), **body}).execute()
    return {"preferences": result.data[0] if result.data else None}


@router.post("/fcm-token")
async def register_fcm(body: dict, user_id: CurrentUserID):
    client = get_supabase_service_client()
    client.table("notification_preferences").upsert({"user_id": str(user_id), "fcm_token": body.get("token"), "push_enabled": True}).execute()
    return {"success": True}
