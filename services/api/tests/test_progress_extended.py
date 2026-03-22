"""Tests for progress endpoints added in router extension: subject/:id, leaderboard, xp."""
import pytest
import uuid
from unittest.mock import patch, MagicMock
from .conftest import TEST_USER_ID, TEST_SUBJECT_ID, make_sb_mock


@pytest.mark.asyncio
async def test_subject_progress(client):
    sb, chain, exe = make_sb_mock()
    subject_data = {"id": str(TEST_SUBJECT_ID), "name": "Physics", "exam_types": ["JEE"]}
    chapters_data = [{"id": str(uuid.uuid4()), "name": "Electrostatics", "chapter_number": 1}]
    chapter_progress_data = []
    concept_states_data = [
        {"mastery_state": "mastered", "mastery_score": 0.9, "concept_id": str(uuid.uuid4())},
        {"mastery_state": "learning", "mastery_score": 0.4, "concept_id": str(uuid.uuid4())},
    ]
    test_sessions_data = [{"score": 12.0, "max_score": 16.0, "started_at": "2024-01-01"}]

    chain.execute.side_effect = [
        MagicMock(data=subject_data),           # subjects.single()
        MagicMock(data=chapters_data),           # chapters
        MagicMock(data=chapter_progress_data),   # learner_chapter_progress
        MagicMock(data=concept_states_data),     # learner_concept_states
        MagicMock(data=test_sessions_data),      # test_sessions
    ]

    with patch("services.api.routers.progress.get_supabase_service_client", return_value=sb):
        r = await client.get(f"/api/v1/progress/subject/{TEST_SUBJECT_ID}")

    assert r.status_code == 200
    body = r.json()
    assert "subject" in body
    assert "chapters" in body
    assert "mastery_distribution" in body
    assert body["mastery_distribution"]["mastered"] == 1
    assert body["mastery_distribution"]["learning"] == 1
    assert "test_performance" in body
    assert body["test_performance"]["average_accuracy"] == 75.0
    assert "concept_map" in body


@pytest.mark.asyncio
async def test_leaderboard(client):
    sb, chain, exe = make_sb_mock()
    # all_xp: heatmap rows for various users
    other_uid = str(uuid.uuid4())
    heatmap_data = [
        {"user_id": str(TEST_USER_ID), "xp_earned": 300},
        {"user_id": str(TEST_USER_ID), "xp_earned": 200},
        {"user_id": other_uid, "xp_earned": 800},
    ]
    cohort_profiles = [
        {"id": str(TEST_USER_ID), "exam_target": "JEE"},
        {"id": other_uid, "exam_target": "JEE"},
    ]
    top_profiles = [
        {"id": other_uid, "full_name": "Top Student", "avatar_url": None},
        {"id": str(TEST_USER_ID), "full_name": "Arjun", "avatar_url": None},
    ]

    chain.execute.side_effect = [
        MagicMock(data=heatmap_data),      # daily_activity_heatmap
        MagicMock(data=cohort_profiles),   # profiles cohort
        MagicMock(data=top_profiles),      # top 10 profiles
    ]

    with patch("services.api.routers.progress.get_supabase_service_client", return_value=sb):
        r = await client.get("/api/v1/progress/leaderboard?exam_type=JEE&period=weekly")

    assert r.status_code == 200
    body = r.json()
    assert "rank" in body
    assert "percentile" in body
    assert "total_students" in body
    assert "top_10" in body
    assert body["total_students"] == 2
    # TEST_USER has 500 XP, other has 800 XP — so rank=2
    assert body["rank"] == 2
    assert body["my_xp"] == 500


@pytest.mark.asyncio
async def test_leaderboard_missing_exam_type(client):
    r = await client.get("/api/v1/progress/leaderboard")
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_leaderboard_invalid_period(client):
    r = await client.get("/api/v1/progress/leaderboard?exam_type=JEE&period=yearly")
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_xp_basic(client):
    sb, chain, exe = make_sb_mock()
    activity_data = [
        {"activity_date": "2024-01-01", "xp_earned": 200, "study_minutes": 120, "cards_reviewed": 10, "questions_attempted": 5},
        {"activity_date": "2024-01-02", "xp_earned": 350, "study_minutes": 180, "cards_reviewed": 20, "questions_attempted": 10},
    ]
    chain.execute.return_value = MagicMock(data=activity_data)

    with patch("services.api.routers.progress.get_supabase_service_client", return_value=sb):
        r = await client.get("/api/v1/progress/xp")

    assert r.status_code == 200
    body = r.json()
    assert body["total_xp"] == 550
    assert body["level"] >= 1
    assert "next_level_xp" in body
    assert len(body["ledger"]) == 2
    assert "badges" in body


@pytest.mark.asyncio
async def test_xp_level_progression(client):
    """Verify level thresholds: 500 XP = level 2, 1200 = level 3, etc."""
    from services.api.routers.progress import _xp_to_level
    assert _xp_to_level(0)[0] == 1
    assert _xp_to_level(499)[0] == 1
    assert _xp_to_level(500)[0] == 2
    assert _xp_to_level(1200)[0] == 3
    assert _xp_to_level(2500)[0] == 4


@pytest.mark.asyncio
async def test_xp_badges_earned(client):
    sb, chain, exe = make_sb_mock()
    # 7+ days of activity → week streak badge; 800 XP → rising star
    activity_data = [
        {"activity_date": f"2024-01-{i:02d}", "xp_earned": 120, "study_minutes": 60, "cards_reviewed": 15, "questions_attempted": 5}
        for i in range(1, 9)  # 8 days
    ]
    chain.execute.return_value = MagicMock(data=activity_data)

    with patch("services.api.routers.progress.get_supabase_service_client", return_value=sb):
        r = await client.get("/api/v1/progress/xp")

    body = r.json()
    badge_ids = [b["id"] for b in body["badges"]]
    assert "first_500xp" in badge_ids   # 8 × 120 = 960 XP ≥ 500
    assert "week_streak" in badge_ids   # 8 days ≥ 7
