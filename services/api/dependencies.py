import uuid
import logging
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from .utils.supabase_client import get_supabase_service_client

logger = logging.getLogger(__name__)
security = HTTPBearer()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
) -> dict:
    """Validate Supabase JWT and return user dict."""
    client = get_supabase_service_client()
    try:
        response = client.auth.get_user(credentials.credentials)
        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error": "invalid_token", "code": "INVALID_JWT"},
            )
        return {"id": uuid.UUID(response.user.id), "email": response.user.email}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "invalid_token", "code": "JWT_VALIDATION_FAILED"},
        )


async def get_current_user_id(
    user: Annotated[dict, Depends(get_current_user)],
) -> uuid.UUID:
    return user["id"]


async def require_pro(
    user: Annotated[dict, Depends(get_current_user)],
) -> dict:
    """Verify user has pro subscription."""
    client = get_supabase_service_client()
    result = (
        client.table("profiles")
        .select("subscription_tier")
        .eq("id", str(user["id"]))
        .single()
        .execute()
    )
    if not result.data or result.data["subscription_tier"] == "free":
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={"error": "subscription_required", "feature": "pro"},
        )
    return user


CurrentUser = Annotated[dict, Depends(get_current_user)]
CurrentUserID = Annotated[uuid.UUID, Depends(get_current_user_id)]
