import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import datetime
from .conftest import TEST_USER_ID, TEST_SESSION_ID, TEST_QUESTION_ID, TEST_TEST_SESSION_ID, make_sb_mock

QUESTION = {
    "id": str(TEST_QUESTION_ID),
    "question_text": "Newton's first law is about?",
    "option_a": "Motion", "option_b": "Gravity",
    "option_c": "Inertia", "option_d": "Force",
    "correct_option": "C",
    "difficulty_level": "Medium",
    "exam_type": "JEE",
    "is_pyq": False,
    "marks_positive": 4, "marks_negative": 1,
    "concept_ids": [], "explanation": "Inertia",
    "verified": True,
}


@pytest.mark.asyncio
async def test_start_test(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.side_effect = [
        MagicMock(data=[{"id": str(TEST_SESSION_ID)}]),       # create study_session
        MagicMock(data=[{"id": str(TEST_TEST_SESSION_ID)}]),  # create test_session
    ]

    with patch("services.api.routers.mcq.get_supabase_service_client", return_value=sb), \
         patch("services.api.routers.mcq.fetch_questions", new_callable=AsyncMock, return_value=[QUESTION]):
        r = await client.post("/api/v1/mcq/start", json={
            "exam_type": "JEE",
            "question_count": 10,
            "duration_minutes": 30,
            "mode": "practice",
        })

    assert r.status_code == 200
    body = r.json()
    assert "test_session_id" in body
    assert "questions" in body
    # correct_option must NOT be in response
    for q in body["questions"]:
        assert "correct_option" not in q


@pytest.mark.asyncio
async def test_start_test_no_questions(client):
    sb, chain, exe = make_sb_mock()
    with patch("services.api.routers.mcq.get_supabase_service_client", return_value=sb), \
         patch("services.api.routers.mcq.fetch_questions", new_callable=AsyncMock, return_value=[]):
        r = await client.post("/api/v1/mcq/start", json={
            "exam_type": "NEET",
            "question_count": 10,
            "duration_minutes": 30,
            "mode": "pyq",
        })

    assert r.status_code == 404
    assert r.json()["detail"]["code"] == "NO_QUESTIONS"


@pytest.mark.asyncio
async def test_start_test_invalid_mode(client):
    r = await client.post("/api/v1/mcq/start", json={
        "exam_type": "JEE",
        "question_count": 10,
        "duration_minutes": 30,
        "mode": "random_mode",
    })
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_submit_answer(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.side_effect = [
        MagicMock(data={"id": str(TEST_TEST_SESSION_ID), "submitted_at": None}),  # session check
        MagicMock(data=[{}]),  # upsert answer
    ]

    with patch("services.api.routers.mcq.get_supabase_service_client", return_value=sb):
        r = await client.post("/api/v1/mcq/answer", json={
            "test_session_id": str(TEST_TEST_SESSION_ID),
            "question_id": str(TEST_QUESTION_ID),
            "selected_option": "C",
            "time_spent_ms": 12000,
        })

    assert r.status_code == 200
    assert r.json()["saved"] is True


@pytest.mark.asyncio
async def test_submit_answer_invalid_option(client):
    r = await client.post("/api/v1/mcq/answer", json={
        "test_session_id": str(TEST_TEST_SESSION_ID),
        "question_id": str(TEST_QUESTION_ID),
        "selected_option": "E",  # invalid
        "time_spent_ms": 1000,
    })
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_submit_answer_already_submitted(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data={"id": str(TEST_TEST_SESSION_ID), "submitted_at": "2024-01-01T10:00:00"})

    with patch("services.api.routers.mcq.get_supabase_service_client", return_value=sb):
        r = await client.post("/api/v1/mcq/answer", json={
            "test_session_id": str(TEST_TEST_SESSION_ID),
            "question_id": str(TEST_QUESTION_ID),
            "selected_option": "A",
            "time_spent_ms": 5000,
        })

    assert r.status_code == 400
    assert r.json()["detail"]["code"] == "ALREADY_SUBMITTED"


@pytest.mark.asyncio
async def test_submit_test(client):
    mock_result = {
        "score": 8.0, "max_score": 16.0, "accuracy": 50.0, "percentile": None,
        "time_taken_minutes": None, "results": [], "concept_performance": [],
        "xp_earned": 16, "knowledge_graph_updates": [],
    }
    with patch("services.api.routers.mcq.grade_test", new_callable=AsyncMock, return_value=mock_result):
        r = await client.post("/api/v1/mcq/submit", json={"test_session_id": str(TEST_TEST_SESSION_ID)})

    assert r.status_code == 200
    body = r.json()
    assert body["score"] == 8.0
    assert body["xp_earned"] == 16


@pytest.mark.asyncio
async def test_list_sessions(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(
        data=[{"id": str(TEST_TEST_SESSION_ID), "score": 12.0, "total_questions": 10}],
        count=1
    )

    with patch("services.api.routers.mcq.get_supabase_service_client", return_value=sb):
        r = await client.get("/api/v1/mcq/sessions")

    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 1
    assert len(body["sessions"]) == 1


@pytest.mark.asyncio
async def test_get_session_not_found(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=None)

    with patch("services.api.routers.mcq.get_supabase_service_client", return_value=sb):
        r = await client.get(f"/api/v1/mcq/session/{TEST_TEST_SESSION_ID}")

    assert r.status_code == 404


@pytest.mark.asyncio
async def test_browse_questions(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=[QUESTION], count=1)

    with patch("services.api.routers.mcq.get_supabase_service_client", return_value=sb):
        r = await client.get("/api/v1/mcq/questions?exam_type=JEE&is_pyq=true")

    assert r.status_code == 200
    assert r.json()["total"] == 1


@pytest.mark.asyncio
async def test_analytics(client):
    sb, chain, exe = make_sb_mock()
    chain.execute.return_value = MagicMock(data=[
        {"score": 12.0, "max_score": 16.0, "exam_type": "JEE", "subject_id": None, "started_at": "2024-01-01"},
    ])

    with patch("services.api.routers.mcq.get_supabase_service_client", return_value=sb):
        r = await client.get("/api/v1/mcq/analytics")

    assert r.status_code == 200
    assert "overall_accuracy" in r.json()
