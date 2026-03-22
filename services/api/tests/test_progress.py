import pytest
from unittest.mock import patch, MagicMock
from datetime import date
from .conftest import TEST_USER_ID, TEST_PLAN_ID, make_sb_mock


@pytest.mark.asyncio
async def test_dashboard(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.side_effect = [
        MagicMock(data={"current_streak": 5, "longest_streak": 10}),      # streak
        MagicMock(data={"plan_date": date.today().isoformat(), "slots": []}),  # today_plan
        MagicMock(data=None, count=8),                                     # due_count
        MagicMock(data=[{"mastery_state": "mastered"}, {"mastery_state": "learning"}]),  # lcs
        MagicMock(data=[{"xp_earned": 150}, {"xp_earned": 100}]),          # heatmap xp
        MagicMock(data={"score": 12.0, "max_score": 16.0}),                # last_test
    ]

    with patch("services.api.routers.progress.get_supabase_service_client", return_value=sb):
        r = await client.get("/api/v1/progress/dashboard")

    assert r.status_code == 200
    body = r.json()
    assert "streak" in body
    assert "today_plan" in body
    assert body["due_cards_count"] == 8
    assert body["knowledge_summary"]["mastered"] == 1
    assert body["weekly_xp"] == 250
    assert body["recent_test_score"] == 75.0


@pytest.mark.asyncio
async def test_dashboard_no_test(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.side_effect = [
        MagicMock(data={"current_streak": 0}),
        MagicMock(data=None),
        MagicMock(data=None, count=0),
        MagicMock(data=[]),
        MagicMock(data=[]),
        MagicMock(data=None),
    ]
    with patch("services.api.routers.progress.get_supabase_service_client", return_value=sb):
        r = await client.get("/api/v1/progress/dashboard")
    assert r.status_code == 200
    assert r.json()["recent_test_score"] is None


@pytest.mark.asyncio
async def test_heatmap(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=[
        {"activity_date": "2024-01-01", "study_minutes": 120, "xp_earned": 200},
        {"activity_date": "2024-01-02", "study_minutes": 90, "xp_earned": 150},
    ])

    with patch("services.api.routers.progress.get_supabase_service_client", return_value=sb):
        r = await client.get("/api/v1/progress/heatmap?months=3")

    assert r.status_code == 200
    assert len(r.json()["days"]) == 2


@pytest.mark.asyncio
async def test_weekly_snapshots(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=[
        {"week_start": "2024-01-01", "overall_score": 72.5, "test_accuracy": 68.0},
    ])

    with patch("services.api.routers.progress.get_supabase_service_client", return_value=sb):
        r = await client.get("/api/v1/progress/weekly")

    assert r.status_code == 200
    assert r.json()["weeks"][0]["overall_score"] == 72.5
