import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import date, timedelta
from .conftest import TEST_USER_ID, TEST_PLAN_ID, make_sb_mock


TODAY = date.today().isoformat()
EXAM_DATE = (date.today() + timedelta(days=365)).isoformat()


@pytest.mark.asyncio
async def test_generate_plan(client):
    mock_plan = {"id": str(TEST_PLAN_ID), "plan": {}, "today": {"slots": []}}
    with patch("services.api.routers.planner.generate_study_plan", new_callable=AsyncMock, return_value=mock_plan):
        r = await client.post("/api/v1/planner/generate", json={
            "exam_type": "JEE",
            "exam_date": EXAM_DATE,
            "daily_hours": 8,
        })

    assert r.status_code == 200
    assert "id" in r.json()


@pytest.mark.asyncio
async def test_generate_plan_invalid_hours(client):
    r = await client.post("/api/v1/planner/generate", json={
        "exam_type": "JEE",
        "exam_date": EXAM_DATE,
        "daily_hours": 25,  # exceeds max 16
    })
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_get_today_plan(client):
    sb, chain, exe = make_sb_mock()
    plan_data = {"id": str(TEST_PLAN_ID), "plan_date": TODAY, "slots": [], "completion_percent": 0}
    chain.execute.return_value = MagicMock(data=plan_data)

    with patch("services.api.routers.planner.get_supabase_service_client", return_value=sb):
        r = await client.get("/api/v1/planner/today")

    assert r.status_code == 200
    body = r.json()
    assert "plan" in body
    assert "completion_percent" in body


@pytest.mark.asyncio
async def test_get_today_plan_not_found(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=None)

    with patch("services.api.routers.planner.get_supabase_service_client", return_value=sb):
        r = await client.get("/api/v1/planner/today")

    # Router returns 200 with plan=None when no plan exists for today
    assert r.status_code == 200
    body = r.json()
    assert body["plan"] is None
    assert body["completion_percent"] == 0


@pytest.mark.asyncio
async def test_get_week_plan(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=[
        {"plan_date": TODAY, "is_completed": True, "completion_percent": 100},
        {"plan_date": TODAY, "is_completed": False, "completion_percent": 50},
    ])

    with patch("services.api.routers.planner.get_supabase_service_client", return_value=sb):
        r = await client.get("/api/v1/planner/week")

    assert r.status_code == 200
    body = r.json()
    assert "days" in body
    assert "week_stats" in body
    assert body["week_stats"]["completed_days"] == 1


@pytest.mark.asyncio
async def test_update_slot_success(client):
    sb, chain, exe = make_sb_mock()
    plan_data = {
        "id": str(TEST_PLAN_ID),
        "slots": [
            {"subject": "Physics", "duration_minutes": 60, "type": "new"},
            {"subject": "Chemistry", "duration_minutes": 60, "type": "revision"},
        ],
        "completion_percent": 0,
    }
    chain.execute.side_effect = [
        MagicMock(data=plan_data),        # get plan
        MagicMock(data=[plan_data]),      # update plan
    ]

    with patch("services.api.routers.planner.get_supabase_service_client", return_value=sb):
        r = await client.patch("/api/v1/planner/today/slot/0", json={"status": "completed", "actual_minutes": 55})

    assert r.status_code == 200
    body = r.json()
    assert "xp_earned" in body
    assert body["xp_earned"] == 20


@pytest.mark.asyncio
async def test_update_slot_out_of_range(client):
    sb, chain, exe = make_sb_mock()
    plan_data = {"id": str(TEST_PLAN_ID), "slots": [{"subject": "Physics"}], "completion_percent": 0}
    chain.execute.return_value = MagicMock(data=plan_data)

    with patch("services.api.routers.planner.get_supabase_service_client", return_value=sb):
        r = await client.patch("/api/v1/planner/today/slot/99", json={"status": "completed"})

    assert r.status_code == 400
    assert r.json()["detail"]["code"] == "SLOT_OUT_OF_RANGE"


@pytest.mark.asyncio
async def test_update_slot_no_plan(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=None)

    with patch("services.api.routers.planner.get_supabase_service_client", return_value=sb):
        r = await client.patch("/api/v1/planner/today/slot/0", json={"status": "skipped"})

    assert r.status_code == 404


@pytest.mark.asyncio
async def test_rebalance(client):
    mock_result = {"plan": {}, "changes": [], "new_today": {"slots": []}}
    with patch("services.api.routers.planner.rebalance_plan", new_callable=AsyncMock, return_value=mock_result):
        r = await client.post("/api/v1/planner/rebalance", json={"reason": "missed yesterday"})

    assert r.status_code == 200


@pytest.mark.asyncio
async def test_update_config_no_plan(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=[])

    with patch("services.api.routers.planner.get_supabase_service_client", return_value=sb):
        r = await client.patch("/api/v1/planner/config", json={"daily_hours": 10})

    assert r.status_code == 404


@pytest.mark.asyncio
async def test_update_config_success(client):
    sb, chain, exe = make_sb_mock()
    plan = {"id": str(TEST_PLAN_ID), "plan_config": {"daily_hours": 8}}
    chain.execute.side_effect = [
        MagicMock(data=[plan]),
        MagicMock(data=[{**plan, "plan_config": {"daily_hours": 10}}]),
    ]

    with patch("services.api.routers.planner.get_supabase_service_client", return_value=sb):
        r = await client.patch("/api/v1/planner/config", json={"daily_hours": 10})

    assert r.status_code == 200


@pytest.mark.asyncio
async def test_planner_history(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=[
        {"plan_date": TODAY, "is_completed": True},
        {"plan_date": TODAY, "is_completed": False},
    ], count=2)

    with patch("services.api.routers.planner.get_supabase_service_client", return_value=sb):
        r = await client.get("/api/v1/planner/history")

    assert r.status_code == 200
    body = r.json()
    assert "plans" in body
    assert "completion_rate" in body
    assert body["completion_rate"] == 50.0
