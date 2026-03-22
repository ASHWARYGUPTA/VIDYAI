import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import date, timedelta
from .conftest import TEST_USER_ID, TEST_CONCEPT_ID, TEST_SESSION_ID, make_sb_mock


@pytest.mark.asyncio
async def test_get_today_deck(client):
    mock_deck = {
        "cards": [{"concept_id": str(TEST_CONCEPT_ID), "priority_score": 95.0}],
        "total_due": 1,
        "new_cards": 0,
        "estimated_minutes": 2,
    }
    with patch("services.api.routers.retention.get_todays_deck", new_callable=AsyncMock, return_value=mock_deck):
        r = await client.get("/api/v1/retention/deck/today")

    assert r.status_code == 200
    body = r.json()
    assert "cards" in body
    assert body["total_due"] == 1


@pytest.mark.asyncio
async def test_get_today_deck_with_params(client):
    mock_deck = {"cards": [], "total_due": 0, "new_cards": 0, "estimated_minutes": 0}
    with patch("services.api.routers.retention.get_todays_deck", new_callable=AsyncMock, return_value=mock_deck):
        r = await client.get("/api/v1/retention/deck/today?limit=10&include_new=false")
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_submit_review(client):
    mock_response = {
        "next_review_date": (date.today() + timedelta(days=6)).isoformat(),
        "new_interval_days": 6,
        "new_mastery_state": "reviewing",
        "new_mastery_score": 0.55,
        "ease_factor": 2.5,
        "xp_earned": 12,
    }
    with patch("services.api.routers.retention.compute_fsrs_update", new_callable=AsyncMock, return_value=mock_response):
        r = await client.post("/api/v1/retention/review", json={
            "concept_id": str(TEST_CONCEPT_ID),
            "quality_score": 4,
            "response_time_ms": 3500,
            "session_id": str(TEST_SESSION_ID),
        })

    assert r.status_code == 200
    body = r.json()
    assert body["xp_earned"] == 12
    assert body["new_mastery_state"] == "reviewing"


@pytest.mark.asyncio
async def test_review_invalid_quality_score(client):
    r = await client.post("/api/v1/retention/review", json={
        "concept_id": str(TEST_CONCEPT_ID),
        "quality_score": 6,  # > 5, invalid
        "response_time_ms": 1000,
        "session_id": str(TEST_SESSION_ID),
    })
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_batch_review(client):
    mock_response = {"next_review_date": date.today().isoformat(), "new_interval_days": 1,
                     "new_mastery_state": "learning", "new_mastery_score": 0.3,
                     "ease_factor": 2.3, "xp_earned": 8}
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data={"current_streak": 3})

    with patch("services.api.routers.retention.compute_fsrs_update", new_callable=AsyncMock, return_value=mock_response), \
         patch("services.api.routers.retention.get_supabase_service_client", return_value=sb):
        r = await client.post("/api/v1/retention/review/batch", json={
            "session_id": str(TEST_SESSION_ID),
            "reviews": [
                {"concept_id": str(TEST_CONCEPT_ID), "quality_score": 3, "response_time_ms": 2000, "session_id": str(TEST_SESSION_ID)},
            ],
        })

    assert r.status_code == 200
    body = r.json()
    assert body["updated"] == 1
    assert "xp_earned" in body


@pytest.mark.asyncio
async def test_knowledge_graph(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=[
        {"concept_id": str(TEST_CONCEPT_ID), "mastery_state": "mastered", "mastery_score": 0.9},
        {"concept_id": str(TEST_CONCEPT_ID), "mastery_state": "learning", "mastery_score": 0.4},
    ])

    with patch("services.api.routers.retention.get_supabase_service_client", return_value=sb):
        r = await client.get("/api/v1/retention/knowledge-graph")

    assert r.status_code == 200
    body = r.json()
    assert "summary" in body
    assert body["summary"]["mastered"] == 1
    assert body["summary"]["learning"] == 1


@pytest.mark.asyncio
async def test_weak_areas(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=[
        {"concept_id": str(TEST_CONCEPT_ID), "mastery_state": "forgotten", "mastery_score": 0.1},
    ])

    with patch("services.api.routers.retention.get_supabase_service_client", return_value=sb):
        r = await client.get("/api/v1/retention/weak-areas")

    assert r.status_code == 200
    assert "weak_concepts" in r.json()


@pytest.mark.asyncio
async def test_get_streak(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data={"current_streak": 7, "longest_streak": 14})

    with patch("services.api.routers.retention.get_supabase_service_client", return_value=sb):
        r = await client.get("/api/v1/retention/streak")

    assert r.status_code == 200
    assert r.json()["streak"]["current_streak"] == 7


@pytest.mark.asyncio
async def test_freeze_streak_success(client):
    sb, chain, exe = make_sb_mock()
    streak_data = {"freeze_tokens_remaining": 2, "current_streak": 5}
    chain.execute.side_effect = [
        MagicMock(data=streak_data),       # get streak
        MagicMock(data=[streak_data]),     # update streak
    ]

    with patch("services.api.routers.retention.get_supabase_service_client", return_value=sb):
        r = await client.post("/api/v1/retention/streak/freeze")

    assert r.status_code == 200
    body = r.json()
    assert body["streak_protected"] is True
    assert body["tokens_remaining"] == 1


@pytest.mark.asyncio
async def test_freeze_streak_no_tokens(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data={"freeze_tokens_remaining": 0})

    with patch("services.api.routers.retention.get_supabase_service_client", return_value=sb):
        r = await client.post("/api/v1/retention/streak/freeze")

    assert r.status_code == 400
    assert r.json()["detail"]["code"] == "FREEZE_EXHAUSTED"


@pytest.mark.asyncio
async def test_freeze_streak_not_found(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=None)

    with patch("services.api.routers.retention.get_supabase_service_client", return_value=sb):
        r = await client.post("/api/v1/retention/streak/freeze")

    assert r.status_code == 404


@pytest.mark.asyncio
async def test_get_schedule(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=[
        {"scheduled_date": date.today().isoformat(), "concept_id": str(TEST_CONCEPT_ID)},
        {"scheduled_date": date.today().isoformat(), "concept_id": str(TEST_CONCEPT_ID)},
    ])

    with patch("services.api.routers.retention.get_supabase_service_client", return_value=sb):
        r = await client.get("/api/v1/retention/schedule?days=3")

    assert r.status_code == 200
    body = r.json()
    assert "schedule" in body
    assert len(body["schedule"]) >= 0
