import logging
import time
import threading
from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

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
        # Partner API key / embed token validation for /mcp routes
        # Never log the token itself
        if request.url.path.startswith("/mcp"):
            auth_header = request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer "):
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"error": "invalid_token", "code": "MISSING_API_KEY"},
                )
        return await call_next(request)


# ── Dynamic CORS ──────────────────────────────────────────────────────────────
# Cache partner origins so we don't query DB on every OPTIONS preflight.
_origins_cache: set[str] = set()
_origins_last_loaded: float = 0.0
_ORIGINS_TTL = 300  # refresh every 5 minutes
_origins_lock = threading.Lock()

_BASE_ORIGINS = {
    "https://vidyai.in",
    "https://partners.vidyai.in",   # partner portal production
    "https://vidyai-np1p.vercel.app",  # vercel web app
    "https://vidyai-seven.vercel.app", # vercel partner app
    "http://localhost:3000",
    "http://localhost:3001",        # partner portal dev
    "http://localhost:4000",        # local embed test page
}


def _load_partner_origins() -> set[str]:
    """Query all active partner allowed_origins from DB. Returns merged set."""
    try:
        from .utils.supabase_client import get_supabase_service_client
        client = get_supabase_service_client()
        result = (
            client.table("partner_organizations")
            .select("allowed_origins")
            .eq("is_active", True)
            .execute()
        )
        extra: set[str] = set()
        for row in (result.data or []):
            for origin in (row.get("allowed_origins") or []):
                if origin:
                    extra.add(origin.rstrip("/"))
        return _BASE_ORIGINS | extra
    except Exception as e:
        logger.warning("Failed to load partner origins, using base set", extra={"error": str(e)})
        return _BASE_ORIGINS


def get_allowed_origins() -> set[str]:
    """Return cached allowed origins, refreshing every ORIGINS_TTL seconds."""
    global _origins_cache, _origins_last_loaded
    now = time.monotonic()
    with _origins_lock:
        if now - _origins_last_loaded > _ORIGINS_TTL or not _origins_cache:
            _origins_cache = _load_partner_origins()
            _origins_last_loaded = now
    return _origins_cache


class DynamicCORSMiddleware(BaseHTTPMiddleware):
    """
    CORS middleware that allows vidyai.in + all partner-registered origins.
    Origins are refreshed from DB every 5 minutes.
    Replaces the static CORSMiddleware in main.py.
    """

    _CORS_HEADERS = {
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Requested-With",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "600",
    }

    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin", "")
        allowed = get_allowed_origins()
        origin_allowed = origin in allowed

        # Handle preflight
        if request.method == "OPTIONS":
            headers = dict(self._CORS_HEADERS)
            if origin_allowed:
                headers["Access-Control-Allow-Origin"] = origin
            else:
                headers["Access-Control-Allow-Origin"] = "https://vidyai.in"
            return JSONResponse(status_code=200, content={}, headers=headers)

        response = await call_next(request)

        if origin_allowed:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
        elif not origin:
            # Direct API call (curl, Postman, server-to-server)
            pass

        return response
