import pytest
from unittest.mock import patch, MagicMock
from datetime import date, timedelta
from .conftest import TEST_USER_ID, TEST_PLAN_ID, make_sb_mock


ONBOARD_PAYLOAD = {
    "full_name": "Arjun Sharma",
    "phone": "9876543210",
    "exam_target": "JEE",
    "exam_date": (date.today() + timedelta(days=300)).isoformat(),
    "current_class": "12",
    "daily_study_hours": 8,
    "preferred_language": "en",
}


@pytest.mark.asyncio
async def test_onboard_success(client):
    sb, chain, exe = make_sb_mock()
    # First call: check existing profile → not onboarded
    not_onboarded = MagicMock()
    not_onboarded.data = {"onboarding_completed": False}
    # profile after update
    updated_profile = MagicMock()
    updated_profile.data = {"id": str(TEST_USER_ID), "full_name": "Arjun Sharma", "onboarding_completed": True}

    chain.execute.side_effect = [
        not_onboarded,   # select onboarding_completed
        MagicMock(data=[{}]),  # update profile
        MagicMock(data=[{}]),  # upsert revision_streaks
        updated_profile,  # select profile for response
    ]

    with patch("services.api.routers.auth.get_supabase_service_client", return_value=sb), \
         patch("services.api.routers.auth.generate_initial_plan", return_value={"id": str(TEST_PLAN_ID)}):
        r = await client.post("/api/v1/auth/onboard", json=ONBOARD_PAYLOAD)

    assert r.status_code == 201
    body = r.json()
    assert "profile" in body
    assert "plan_id" in body


@pytest.mark.asyncio
async def test_onboard_already_done(client):
    sb, chain, exe = make_sb_mock()
    already = MagicMock()
    already.data = {"onboarding_completed": True}
    chain.execute.return_value = already

    with patch("services.api.routers.auth.get_supabase_service_client", return_value=sb):
        r = await client.post("/api/v1/auth/onboard", json=ONBOARD_PAYLOAD)

    assert r.status_code == 400
    assert r.json()["detail"]["code"] == "ONBOARDING_COMPLETE"


@pytest.mark.asyncio
async def test_onboard_invalid_class(client):
    payload = {**ONBOARD_PAYLOAD, "current_class": "invalid"}
    r = await client.post("/api/v1/auth/onboard", json=payload)
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_onboard_invalid_language(client):
    payload = {**ONBOARD_PAYLOAD, "preferred_language": "spanish"}
    r = await client.post("/api/v1/auth/onboard", json=payload)
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_get_profile(client):
    sb, chain, exe = make_sb_mock()
    profile_data = {"id": str(TEST_USER_ID), "email": "test@vidyai.in", "subscription_tier": "free"}
    sub_data = {"tier": "free", "is_active": True}
    streak_data = {"current_streak": 5}

    chain.execute.side_effect = [
        MagicMock(data=profile_data),
        MagicMock(data=sub_data),
        MagicMock(data=streak_data),
    ]

    with patch("services.api.routers.auth.get_supabase_service_client", return_value=sb):
        r = await client.get("/api/v1/auth/profile")

    assert r.status_code == 200
    body = r.json()
    assert "profile" in body
    assert "subscription" in body
    assert "streak" in body


@pytest.mark.asyncio
async def test_update_profile(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=[{"full_name": "New Name"}])

    with patch("services.api.routers.auth.get_supabase_service_client", return_value=sb):
        r = await client.patch("/api/v1/auth/profile", json={"full_name": "New Name"})

    assert r.status_code == 200
    assert "profile" in r.json()


@pytest.mark.asyncio
async def test_get_subscription(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.side_effect = [
        MagicMock(data={"subscription_tier": "free"}),
        MagicMock(data=None),
    ]

    with patch("services.api.routers.auth.get_supabase_service_client", return_value=sb):
        r = await client.get("/api/v1/auth/subscription")

    assert r.status_code == 200
    body = r.json()
    assert body["tier"] == "free"
    assert "features_unlocked" in body


@pytest.mark.asyncio
async def test_subscription_create_not_implemented(client):
    r = await client.post("/api/v1/auth/subscription/create", json={"plan": "pro"})
    assert r.status_code == 501


@pytest.mark.asyncio
async def test_no_auth_returns_401(unauthed_client):
    r = await unauthed_client.get("/api/v1/auth/profile")
    assert r.status_code == 401
