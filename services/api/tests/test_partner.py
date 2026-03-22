"""Tests for Router 11 — Partner Admin /api/v1/partner."""
import uuid
import pytest
from unittest.mock import patch, MagicMock
from datetime import date, timedelta
from .conftest import make_sb_mock

PARTNER_ID = str(uuid.uuid4())
KEY_ID = str(uuid.uuid4())

PARTNER_CTX = {
    "partner_id": PARTNER_ID,
    "partner_name": "PhysicsWallah",
    "key_id": KEY_ID,
    "tier": "starter",
    "allowed_features": ["tutor", "retention", "planner", "mcq", "content"],
    "scopes": ["tutor:read", "retention:write"],
}


@pytest.fixture
def partner_client(app):
    """Inject partner auth dependency for partner routes."""
    from services.api.dependencies_partner import get_partner
    app.dependency_overrides[get_partner] = lambda: PARTNER_CTX
    return app


@pytest.mark.asyncio
async def test_create_key(partner_client):
    from httpx import AsyncClient, ASGITransport
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=[{"id": KEY_ID}])

    with patch("services.api.routers.partner.get_supabase_service_client", return_value=sb):
        async with AsyncClient(transport=ASGITransport(app=partner_client), base_url="http://test") as c:
            r = await c.post("/api/v1/partner/keys", json={
                "name": "Production Key",
                "scopes": ["tutor:read", "retention:write"],
            })

    assert r.status_code == 201
    body = r.json()
    assert "api_key" in body
    assert body["api_key"].startswith("vida_live_")
    assert "key_prefix" in body
    assert "id" in body
    # Ensure key prefix matches the start of the full key
    assert body["api_key"].startswith(body["key_prefix"])


@pytest.mark.asyncio
async def test_create_key_with_expiry(partner_client):
    from httpx import AsyncClient, ASGITransport
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=[{"id": KEY_ID}])

    expires = (date.today() + timedelta(days=30)).isoformat()
    with patch("services.api.routers.partner.get_supabase_service_client", return_value=sb):
        async with AsyncClient(transport=ASGITransport(app=partner_client), base_url="http://test") as c:
            r = await c.post("/api/v1/partner/keys", json={
                "name": "Expiring Key",
                "scopes": ["tutor:read"],
                "expires_at": expires,
            })
    assert r.status_code == 201


@pytest.mark.asyncio
async def test_list_keys(partner_client):
    from httpx import AsyncClient, ASGITransport
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=[
        {"id": KEY_ID, "key_prefix": "vida_live_ab12", "name": "Prod Key", "is_active": True, "total_calls": 1234},
    ])

    with patch("services.api.routers.partner.get_supabase_service_client", return_value=sb):
        async with AsyncClient(transport=ASGITransport(app=partner_client), base_url="http://test") as c:
            r = await c.get("/api/v1/partner/keys")

    assert r.status_code == 200
    body = r.json()
    assert "keys" in body
    assert len(body["keys"]) == 1
    # Must NOT contain any full key value
    for key in body["keys"]:
        assert "api_key" not in key
        assert "key_hash" not in key


@pytest.mark.asyncio
async def test_revoke_key(partner_client):
    from httpx import AsyncClient, ASGITransport
    sb, chain, exe = make_sb_mock()
    chain.execute.side_effect = [
        MagicMock(data={"id": KEY_ID}),   # existence check
        MagicMock(data=[{}]),              # update is_active=False
    ]

    with patch("services.api.routers.partner.get_supabase_service_client", return_value=sb):
        async with AsyncClient(transport=ASGITransport(app=partner_client), base_url="http://test") as c:
            r = await c.delete(f"/api/v1/partner/keys/{KEY_ID}")

    assert r.status_code == 200
    assert r.json()["revoked"] is True


@pytest.mark.asyncio
async def test_revoke_key_not_found(partner_client):
    from httpx import AsyncClient, ASGITransport
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=None)

    with patch("services.api.routers.partner.get_supabase_service_client", return_value=sb):
        async with AsyncClient(transport=ASGITransport(app=partner_client), base_url="http://test") as c:
            r = await c.delete(f"/api/v1/partner/keys/{uuid.uuid4()}")

    assert r.status_code == 404
    assert r.json()["detail"]["code"] == "KEY_NOT_FOUND"


@pytest.mark.asyncio
async def test_get_usage(partner_client):
    from httpx import AsyncClient, ASGITransport
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=[
        {"tool_name": "solve_doubt", "called_at": "2024-01-15T10:00:00", "latency_ms": 800, "tokens_used": 250, "status_code": 200},
        {"tool_name": "solve_doubt", "called_at": "2024-01-15T11:00:00", "latency_ms": 900, "tokens_used": 300, "status_code": 200},
        {"tool_name": "get_study_plan", "called_at": "2024-01-16T09:00:00", "latency_ms": 200, "tokens_used": 0, "status_code": 200},
    ])

    with patch("services.api.routers.partner.get_supabase_service_client", return_value=sb):
        async with AsyncClient(transport=ASGITransport(app=partner_client), base_url="http://test") as c:
            r = await c.get("/api/v1/partner/usage?from=2024-01-01&to=2024-01-31")

    assert r.status_code == 200
    body = r.json()
    assert body["total_calls"] == 3
    assert body["tokens_used"] == 550
    by_tool = {entry["tool"]: entry["count"] for entry in body["by_tool"]}
    assert by_tool["solve_doubt"] == 2
    assert by_tool["get_study_plan"] == 1
    assert len(body["by_day"]) == 2  # 2 distinct dates


@pytest.mark.asyncio
async def test_get_usage_filter_by_tool(partner_client):
    from httpx import AsyncClient, ASGITransport
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=[
        {"tool_name": "solve_doubt", "called_at": "2024-01-15T10:00:00", "latency_ms": 800, "tokens_used": 250, "status_code": 200},
    ])

    with patch("services.api.routers.partner.get_supabase_service_client", return_value=sb):
        async with AsyncClient(transport=ASGITransport(app=partner_client), base_url="http://test") as c:
            r = await c.get("/api/v1/partner/usage?tool=solve_doubt")

    assert r.status_code == 200
    assert r.json()["total_calls"] == 1


@pytest.mark.asyncio
async def test_list_students(partner_client):
    from httpx import AsyncClient, ASGITransport
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(
        data=[
            {"external_student_id": "pw_student_001", "exam_type": "JEE"},
            {"external_student_id": "pw_student_002", "exam_type": "NEET"},
        ],
        count=2
    )

    with patch("services.api.routers.partner.get_supabase_service_client", return_value=sb):
        async with AsyncClient(transport=ASGITransport(app=partner_client), base_url="http://test") as c:
            r = await c.get("/api/v1/partner/students")

    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 2
    assert len(body["students"]) == 2


@pytest.mark.asyncio
async def test_partner_key_uniqueness():
    """Each generated key must be unique and start with vida_live_."""
    from services.api.routers.partner import _generate_api_key
    keys = set()
    for _ in range(100):
        raw, prefix, key_hash = _generate_api_key()
        assert raw.startswith("vida_live_")
        assert raw not in keys
        keys.add(raw)
        assert len(key_hash) == 64  # SHA-256 hex


@pytest.mark.asyncio
async def test_no_partner_auth_returns_401(client):
    """Without partner auth, partner routes must return 401."""
    r = await client.get("/api/v1/partner/keys")
    # The client fixture uses JWT overrides, not partner key — so this should fail at bearer level
    assert r.status_code in (401, 403)
