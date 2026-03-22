import os
import uuid
import pytest
import pytest_asyncio
from unittest.mock import MagicMock
from httpx import AsyncClient, ASGITransport

# Set required env vars BEFORE any app module is imported
os.environ.setdefault("SUPABASE_URL", "http://localhost:54321")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key")

from services.api.main import create_app  # noqa: E402
from services.api.dependencies import get_current_user, get_current_user_id  # noqa: E402

# ── Fixed test IDs ────────────────────────────────────────────────────────────
TEST_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
TEST_USER = {"id": TEST_USER_ID, "email": "test@vidyai.in"}
TEST_CONCEPT_ID = uuid.UUID("00000000-0000-0000-0000-000000000010")
TEST_CHAPTER_ID = uuid.UUID("00000000-0000-0000-0000-000000000020")
TEST_SUBJECT_ID = uuid.UUID("00000000-0000-0000-0000-000000000030")
TEST_SESSION_ID = uuid.UUID("00000000-0000-0000-0000-000000000040")
TEST_DOUBT_ID = uuid.UUID("00000000-0000-0000-0000-000000000050")
TEST_PLAN_ID = uuid.UUID("00000000-0000-0000-0000-000000000060")
TEST_TEST_SESSION_ID = uuid.UUID("00000000-0000-0000-0000-000000000070")
TEST_VIDEO_ID = uuid.UUID("00000000-0000-0000-0000-000000000080")
TEST_QUESTION_ID = uuid.UUID("00000000-0000-0000-0000-000000000090")


def make_sb_mock(**kwargs):
    """Build a chainable supabase-py mock. Every method returns self for chaining; execute() returns data."""
    m = MagicMock()
    # Default execute result
    execute_result = MagicMock()
    execute_result.data = kwargs.get("data", [])
    execute_result.count = kwargs.get("count", 0)
    # Chain: .table().select().eq()...execute() all return execute_result
    chain = MagicMock()
    chain.execute.return_value = execute_result
    chain.select.return_value = chain
    chain.eq.return_value = chain
    chain.neq.return_value = chain
    chain.gte.return_value = chain
    chain.lte.return_value = chain
    chain.in_.return_value = chain
    chain.not_.return_value = chain
    chain.is_.return_value = chain
    chain.contains.return_value = chain
    chain.overlaps.return_value = chain
    chain.order.return_value = chain
    chain.limit.return_value = chain
    chain.range.return_value = chain
    chain.single.return_value = chain
    chain.maybe_single.return_value = chain
    chain.upsert.return_value = chain
    chain.insert.return_value = chain
    chain.update.return_value = chain
    chain.delete.return_value = chain
    chain.not_ = chain
    m.table.return_value = chain
    m.rpc.return_value = chain
    m.auth = MagicMock()
    return m, chain, execute_result


@pytest.fixture
def app():
    application = create_app()
    # Override auth so all requests are authenticated
    application.dependency_overrides[get_current_user] = lambda: TEST_USER
    application.dependency_overrides[get_current_user_id] = lambda: TEST_USER_ID
    return application


@pytest_asyncio.fixture
async def client(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def unauthed_client():
    """Client without auth overrides — for testing 401 responses."""
    from services.api.main import create_app
    application = create_app()
    async with AsyncClient(transport=ASGITransport(app=application), base_url="http://test") as c:
        yield c
