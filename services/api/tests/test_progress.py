import pytest
from unittest.mock import patch, MagicMock, call
from datetime import date
from .conftest import TEST_USER_ID, TEST_PLAN_ID, make_sb_mock


def _make_per_table_sb_mock(table_results: dict):
    """Create a supabase mock where each table name returns a fixed result.

    This avoids ordering issues when asyncio.gather + run_in_executor calls
    execute() from multiple threads concurrently.
    """
    m = MagicMock()

    def _make_chain(result):
        chain = MagicMock()
        chain.execute.return_value = result
        for method in ("select", "eq", "neq", "gte", "lte", "order", "limit",
                       "range", "single", "maybe_single", "insert", "update",
                       "delete", "upsert", "in_", "is_", "contains", "overlaps"):
            getattr(chain, method).return_value = chain
        chain.not_ = chain
        return chain

    def _table(name):
        result = table_results.get(name, MagicMock(data=None, count=0))
        return _make_chain(result)

    m.table.side_effect = _table
    m.rpc.return_value = _make_chain(MagicMock(data=None, count=0))
    m.auth = MagicMock()
    return m


@pytest.mark.asyncio
async def test_dashboard(client):
    sb = _make_per_table_sb_mock({
        "revision_streaks":       MagicMock(data={"current_streak": 5, "longest_streak": 10}),
        "daily_study_plans":      MagicMock(data={"plan_date": date.today().isoformat(), "slots": []}),
        "revision_queue":         MagicMock(data=[], count=8),
        "learner_concept_states": MagicMock(data=[{"mastery_state": "mastered"}, {"mastery_state": "learning"}]),
        "daily_activity_heatmap": MagicMock(data=[{"xp_earned": 150}, {"xp_earned": 100}]),
        "test_sessions":          MagicMock(data={"score": 12.0, "max_score": 16.0}),
    })

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
    sb = _make_per_table_sb_mock({
        "revision_streaks":       MagicMock(data={"current_streak": 0}),
        "daily_study_plans":      MagicMock(data=None),
        "revision_queue":         MagicMock(data=[], count=0),
        "learner_concept_states": MagicMock(data=[]),
        "daily_activity_heatmap": MagicMock(data=[]),
        "test_sessions":          MagicMock(data=None),
    })
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
