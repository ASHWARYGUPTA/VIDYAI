import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
import sentry_sdk

from .config import get_settings
from .routers import auth, tutor, retention, planner, mcq, content, progress, syllabus, notifications, partner, mcp as mcp_router, knowledge, pdf_tests, embed
from .middleware import RateLimitMiddleware, PartnerKeyMiddleware, DynamicCORSMiddleware

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    if settings.sentry_dsn:
        sentry_sdk.init(dsn=settings.sentry_dsn, environment=settings.environment)
    logger.info("VidyAI API starting", extra={"environment": settings.environment})
    yield
    logger.info("VidyAI API shutting down")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="VidyAI API",
        version="1.0.0",
        docs_url="/docs" if settings.environment != "production" else None,
        redoc_url=None,
        lifespan=lifespan,
    )

    # Dynamic CORS: vidyai.in + all partner-registered domains (refreshed every 5 min)
    app.add_middleware(DynamicCORSMiddleware)
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(PartnerKeyMiddleware)

    app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
    app.include_router(tutor.router, prefix="/api/v1/tutor", tags=["tutor"])
    app.include_router(retention.router, prefix="/api/v1/retention", tags=["retention"])
    app.include_router(planner.router, prefix="/api/v1/planner", tags=["planner"])
    app.include_router(mcq.router, prefix="/api/v1/mcq", tags=["mcq"])
    app.include_router(content.router, prefix="/api/v1/content", tags=["content"])
    app.include_router(progress.router, prefix="/api/v1/progress", tags=["progress"])
    app.include_router(syllabus.router, prefix="/api/v1/syllabus", tags=["syllabus"])
    app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["notifications"])
    app.include_router(partner.router, prefix="/api/v1/partner", tags=["partner"])
    app.include_router(knowledge.router, prefix="/api/v1/knowledge", tags=["knowledge"])
    app.include_router(pdf_tests.router, prefix="/api/v1/tests", tags=["tests"])
    app.include_router(embed.router, prefix="/api/v1/embed", tags=["embed"])
    app.include_router(mcp_router.router, tags=["mcp"])

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled exception", extra={"path": request.url.path})
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": "internal_server_error", "code": "INTERNAL_ERROR"},
        )

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    return app


app = create_app()
