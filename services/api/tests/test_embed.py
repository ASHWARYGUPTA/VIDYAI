"""Tests for Router — Embed Session API /api/v1/embed"""
import uuid
import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock

from .conftest import make_sb_mock

PARTNER_ID = str(uuid.uuid4())
USER_ID    = str(uuid.uuid4())

PARTNER_CTX = {
    "partner_id": PARTNER_ID,
    "partner_name": "TestCo",
    "key_id": str(uuid.uuid4()),
    "tier": "starter",
    "allowed_features": ["tutor", "planner", "tests", "graph", "knowledge", "content"],
    "scopes": ["tutor", "planner", "tests"],
    "student_id": None,
    "token_type": "api_key",
}


@pytest.fixture
def partner_app(app):
    from services.api.dependencies_partner import get_partner
    app.dependency_overrides[get_partner] = lambda: PARTNER_CTX
    return app


@pytest.fixture
def partner_client(partner_app):
    return partner_app


# ── POST /session ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_embed_session(partner_client):
    from httpx import AsyncClient, ASGITransport
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=[{"id": str(uuid.uuid4())}])

    with patch("services.api.routers.embed.get_supabase_service_client", return_value=sb):
        async with AsyncClient(transport=ASGITransport(app=partner_client), base_url="http://test") as c:
            r = await c.post("/api/v1/embed/session", json={
                "student_id": "student_abc",
                "exam_type": "JEE",
                "features": ["tutor", "planner"],
            })

    assert r.status_code == 201
    body = r.json()
    assert body["embed_token"].startswith("et_")
    assert "expires_at" in body
    assert set(body["features"]).issubset({"tutor", "planner", "tests", "graph", "knowledge", "content"})
    assert body["student_id"] == "student_abc"
    assert body["ttl_minutes"] == 60


@pytest.mark.asyncio
async def test_create_embed_session_filters_to_allowed_features(partner_client):
    """Requested features are intersected with partner's allowed_features."""
    from httpx import AsyncClient, ASGITransport
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=[{"id": str(uuid.uuid4())}])

    with patch("services.api.routers.embed.get_supabase_service_client", return_value=sb):
        async with AsyncClient(transport=ASGITransport(app=partner_client), base_url="http://test") as c:
            r = await c.post("/api/v1/embed/session", json={
                "student_id": "stu_x",
                "features": ["tutor", "invalid_feature"],
            })

    assert r.status_code == 201
    assert "invalid_feature" not in r.json()["features"]


@pytest.mark.asyncio
async def test_create_embed_session_no_features_403(app):
    """If no allowed features match → 403."""
    from httpx import AsyncClient, ASGITransport
    from services.api.dependencies_partner import get_partner
    no_feature_ctx = {**PARTNER_CTX, "allowed_features": []}
    app.dependency_overrides[get_partner] = lambda: no_feature_ctx

    sb, chain, _ = make_sb_mock()
    with patch("services.api.routers.embed.get_supabase_service_client", return_value=sb):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            r = await c.post("/api/v1/embed/session", json={"student_id": "stu_y", "features": ["tutor"]})

    assert r.status_code == 403
    assert r.json()["detail"]["code"] == "FEATURE_NOT_PERMITTED"


@pytest.mark.asyncio
async def test_create_embed_session_defaults_to_all_features(partner_client):
    """features=None defaults to all partner-allowed features."""
    from httpx import AsyncClient, ASGITransport
    sb, chain, _ = make_sb_mock()
    chain.execute.return_value = MagicMock(data=[{"id": str(uuid.uuid4())}])

    with patch("services.api.routers.embed.get_supabase_service_client", return_value=sb):
        async with AsyncClient(transport=ASGITransport(app=partner_client), base_url="http://test") as c:
            r = await c.post("/api/v1/embed/session", json={"student_id": "stu_z"})

    assert r.status_code == 201
    # Should have at least 1 feature
    assert len(r.json()["features"]) >= 1


# ── GET /session/validate ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_validate_api_key(partner_client):
    from httpx import AsyncClient, ASGITransport
    async with AsyncClient(transport=ASGITransport(app=partner_client), base_url="http://test") as c:
        r = await c.get("/api/v1/embed/session/validate")

    assert r.status_code == 200
    body = r.json()
    assert body["valid"] is True
    assert body["partner_name"] == "TestCo"
    assert body["tier"] == "starter"
    assert isinstance(body["allowed_features"], list)


@pytest.mark.asyncio
async def test_validate_no_auth_401(unauthed_client):
    r = await unauthed_client.get("/api/v1/embed/session/validate")
    assert r.status_code == 401


# ── GET /settings ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_embed_settings(partner_client):
    from httpx import AsyncClient, ASGITransport
    sb, chain, _ = make_sb_mock()
    chain.execute.return_value = MagicMock(data={
        "allowed_origins": ["https://pw.live"],
        "webhook_url": None,
        "allowed_features": ["tutor"],
        "tier": "starter",
    })

    with patch("services.api.routers.embed.get_supabase_service_client", return_value=sb):
        async with AsyncClient(transport=ASGITransport(app=partner_client), base_url="http://test") as c:
            r = await c.get("/api/v1/embed/settings")

    assert r.status_code == 200
    assert "allowed_origins" in r.json()


# ── PATCH /settings ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_update_embed_settings(partner_client):
    from httpx import AsyncClient, ASGITransport
    sb, chain, _ = make_sb_mock()
    chain.execute.return_value = MagicMock(data=[{}])

    with patch("services.api.routers.embed.get_supabase_service_client", return_value=sb):
        async with AsyncClient(transport=ASGITransport(app=partner_client), base_url="http://test") as c:
            r = await c.patch("/api/v1/embed/settings", json={
                "allowed_origins": ["https://example.com"],
                "webhook_url": "https://example.com/hook",
            })

    assert r.status_code == 200
    assert "updated" in r.json()


@pytest.mark.asyncio
async def test_update_embed_settings_empty_400(partner_client):
    from httpx import AsyncClient, ASGITransport
    sb, chain, _ = make_sb_mock()

    with patch("services.api.routers.embed.get_supabase_service_client", return_value=sb):
        async with AsyncClient(transport=ASGITransport(app=partner_client), base_url="http://test") as c:
            r = await c.patch("/api/v1/embed/settings", json={"unrecognised_key": "val"})

    assert r.status_code == 400


# ── Token helpers ─────────────────────────────────────────────────────────────

def test_embed_token_format():
    from services.api.routers.embed import _make_embed_token
    raw, token_hash = _make_embed_token()
    assert raw.startswith("et_")
    assert len(token_hash) == 64          # SHA-256 hex
    assert raw != token_hash              # raw != hash


def test_embed_token_uniqueness():
    from services.api.routers.embed import _make_embed_token
    tokens = {_make_embed_token()[0] for _ in range(50)}
    assert len(tokens) == 50             # all unique


# ── POST /onboard ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_onboard_partner_creates_org(app):
    from httpx import AsyncClient, ASGITransport
    org_id = str(uuid.uuid4())
    sb, chain, _ = make_sb_mock()

    # Sequence: auth.get_user → partner_users (no existing) → slug check (no conflict) → org insert → partner_users insert
    sb.auth.get_user = MagicMock(return_value=MagicMock(user=MagicMock(id=USER_ID)))
    call_count = 0
    def execute_side_effect():
        nonlocal call_count
        call_count += 1
        if call_count == 1:   # partner_users lookup
            return MagicMock(data=None)
        if call_count == 2:   # slug uniqueness check
            return MagicMock(data=None)
        if call_count == 3:   # org insert
            return MagicMock(data=[{"id": org_id}])
        return MagicMock(data=[{}])  # partner_users insert
    chain.execute.side_effect = lambda: execute_side_effect()

    with patch("services.api.routers.embed.get_supabase_service_client", return_value=sb):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            r = await c.post(
                "/api/v1/embed/onboard",
                json={"org_name": "TestOrg"},
                headers={"Authorization": "Bearer fake-jwt"},
            )

    assert r.status_code == 201
    body = r.json()
    assert body["org_name"] == "TestOrg"
    assert "partner_id" in body
    assert body["tier"] == "starter"
