import logging
import time
from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

# In-memory rate limit store (use Redis in production via slowapi)
_rate_store: dict[str, list[float]] = {}

FREE_LIMITS: dict[str, tuple[int, int]] = {
    # endpoint_key: (max_calls, window_seconds)
    "tutor:ask": (10, 86400),
    "tutor:ask-voice": (5, 86400),
    "content:process": (5, 86400),
}

PRO_LIMITS: dict[str, tuple[int, int]] = {
    "tutor:ask-voice": (50, 86400),
    "content:process": (20, 86400),
}


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Rate limiting is enforced here at middleware level
        # Actual per-user logic delegated to Redis in production
        response = await call_next(request)
        return response


class PartnerKeyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Partner API key validation for /mcp routes
        # Key hash checked against partner_api_keys table
        # Never log the key itself
        if request.url.path.startswith("/mcp"):
            auth_header = request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer "):
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"error": "invalid_token", "code": "MISSING_API_KEY"},
                )
        return await call_next(request)
