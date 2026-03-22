import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from .conftest import TEST_USER_ID, TEST_DOUBT_ID, TEST_SESSION_ID, make_sb_mock


@pytest.mark.asyncio
async def test_ask_success(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.side_effect = [
        MagicMock(data={"subscription_tier": "free"}),  # tier check
        MagicMock(data=None, count=0),                  # rate limit count
        MagicMock(data=[{"id": str(TEST_SESSION_ID)}]), # create study_session
    ]

    mock_answer = {
        "doubt_id": TEST_DOUBT_ID,
        "answer": "Newton's first law states...",
        "answer_language": "en",
        "sources": [],
        "related_concepts": [],
        "follow_up_suggestions": [],
        "tokens_used": 250,
        "latency_ms": 800,
    }

    with patch("services.api.routers.tutor.get_supabase_service_client", return_value=sb), \
         patch("services.api.routers.tutor.answer_doubt", new_callable=AsyncMock, return_value=mock_answer):
        r = await client.post("/api/v1/tutor/ask", json={"question": "What is Newton's first law?"})

    assert r.status_code == 200
    body = r.json()
    assert "answer" in body
    assert "sources" in body
    assert body["tokens_used"] == 250


@pytest.mark.asyncio
async def test_ask_question_too_short(client):
    r = await client.post("/api/v1/tutor/ask", json={"question": "hi"})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_ask_rate_limit_free(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.side_effect = [
        MagicMock(data={"subscription_tier": "free"}),
        MagicMock(data=None, count=10),  # already at limit
    ]

    with patch("services.api.routers.tutor.get_supabase_service_client", return_value=sb):
        r = await client.post("/api/v1/tutor/ask", json={"question": "What is photosynthesis?"})

    assert r.status_code == 429
    assert r.json()["detail"]["code"] == "FREE_LIMIT_REACHED"


@pytest.mark.asyncio
async def test_get_history(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=[{"id": str(TEST_DOUBT_ID), "question_text": "Q?"}], count=1)

    with patch("services.api.routers.tutor.get_supabase_service_client", return_value=sb):
        r = await client.get("/api/v1/tutor/history")

    assert r.status_code == 200
    body = r.json()
    assert "doubts" in body
    assert body["total"] == 1


@pytest.mark.asyncio
async def test_get_doubt_found(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data={"id": str(TEST_DOUBT_ID), "answer_text": "Answer"})

    with patch("services.api.routers.tutor.get_supabase_service_client", return_value=sb):
        r = await client.get(f"/api/v1/tutor/doubt/{TEST_DOUBT_ID}")

    assert r.status_code == 200
    assert "doubt" in r.json()


@pytest.mark.asyncio
async def test_get_doubt_not_found(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=None)

    with patch("services.api.routers.tutor.get_supabase_service_client", return_value=sb):
        r = await client.get(f"/api/v1/tutor/doubt/{TEST_DOUBT_ID}")

    assert r.status_code == 404
    assert r.json()["detail"]["code"] == "DOUBT_NOT_FOUND"


@pytest.mark.asyncio
async def test_feedback(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=[{}])

    with patch("services.api.routers.tutor.get_supabase_service_client", return_value=sb):
        r = await client.post(f"/api/v1/tutor/doubt/{TEST_DOUBT_ID}/feedback", json={"was_helpful": True})

    assert r.status_code == 200
    assert r.json()["success"] is True


@pytest.mark.asyncio
async def test_ask_with_session_id(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.side_effect = [
        MagicMock(data={"subscription_tier": "pro"}),
        MagicMock(data=None, count=0),
    ]
    mock_answer = {
        "doubt_id": TEST_DOUBT_ID, "answer": "...", "answer_language": "en",
        "sources": [], "related_concepts": [], "follow_up_suggestions": [],
        "tokens_used": 100, "latency_ms": 500,
    }
    with patch("services.api.routers.tutor.get_supabase_service_client", return_value=sb), \
         patch("services.api.routers.tutor.answer_doubt", new_callable=AsyncMock, return_value=mock_answer):
        r = await client.post("/api/v1/tutor/ask", json={
            "question": "Explain Boyle's law in detail",
            "session_id": str(TEST_SESSION_ID),
        })
    assert r.status_code == 200
