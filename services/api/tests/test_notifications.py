import pytest
from unittest.mock import patch, MagicMock
import uuid
from .conftest import TEST_USER_ID, make_sb_mock

TEST_NOTIF_ID = uuid.UUID("00000000-0000-0000-0000-0000000000FF")


@pytest.mark.asyncio
async def test_list_notifications(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.side_effect = [
        MagicMock(data=[{"id": str(TEST_NOTIF_ID), "title": "Revision due!", "is_read": False}], count=1),
        MagicMock(data=None, count=1),
    ]

    with patch("services.api.routers.notifications.get_supabase_service_client", return_value=sb):
        r = await client.get("/api/v1/notifications")

    assert r.status_code == 200
    body = r.json()
    assert "notifications" in body
    assert body["unread_count"] == 1


@pytest.mark.asyncio
async def test_list_unread_only(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.side_effect = [
        MagicMock(data=[], count=0),
        MagicMock(data=None, count=0),
    ]
    with patch("services.api.routers.notifications.get_supabase_service_client", return_value=sb):
        r = await client.get("/api/v1/notifications?unread_only=true")
    assert r.status_code == 200
    assert r.json()["unread_count"] == 0


@pytest.mark.asyncio
async def test_mark_read(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=[{}])

    with patch("services.api.routers.notifications.get_supabase_service_client", return_value=sb):
        r = await client.patch(f"/api/v1/notifications/{TEST_NOTIF_ID}/read")

    assert r.status_code == 200
    assert r.json()["success"] is True


@pytest.mark.asyncio
async def test_mark_all_read(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=[{}, {}, {}])

    with patch("services.api.routers.notifications.get_supabase_service_client", return_value=sb):
        r = await client.patch("/api/v1/notifications/read-all")

    assert r.status_code == 200
    assert r.json()["updated"] == 3


@pytest.mark.asyncio
async def test_get_preferences(client):
    sb, chain, exe = make_sb_mock()
    prefs = {"user_id": str(TEST_USER_ID), "revision_reminders": True, "email_enabled": True}
    chain.execute.return_value = MagicMock(data=prefs)

    with patch("services.api.routers.notifications.get_supabase_service_client", return_value=sb):
        r = await client.get("/api/v1/notifications/preferences")

    assert r.status_code == 200
    assert r.json()["preferences"]["revision_reminders"] is True


@pytest.mark.asyncio
async def test_update_preferences(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=[{"revision_reminders": False}])

    with patch("services.api.routers.notifications.get_supabase_service_client", return_value=sb):
        r = await client.patch("/api/v1/notifications/preferences", json={"revision_reminders": False})

    assert r.status_code == 200


@pytest.mark.asyncio
async def test_register_fcm(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=[{}])

    with patch("services.api.routers.notifications.get_supabase_service_client", return_value=sb):
        r = await client.post("/api/v1/notifications/fcm-token", json={"token": "fcm-xyz-123"})

    assert r.status_code == 200
    assert r.json()["success"] is True
