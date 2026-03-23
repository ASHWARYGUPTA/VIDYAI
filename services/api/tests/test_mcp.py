"""
Tests for MCP tools in routers/mcp.py.

Strategy: mock _auth_partner, _resolve_student, _ensure_mapping and the
underlying service calls so tests stay fast and deterministic.
The MCP tools are plain async functions — call them directly (no HTTP layer needed).
"""
import uuid
import pytest
from datetime import date
from unittest.mock import AsyncMock, patch, MagicMock

PARTNER_ID  = str(uuid.uuid4())
KEY_ID      = str(uuid.uuid4())
STUDENT_ID  = "pw_student_001"
USER_ID     = uuid.uuid4()

PARTNER_CTX = {
    "partner_id": PARTNER_ID,
    "key_id": KEY_ID,
    "allowed_features": ["tutor", "retention", "planner", "mcq", "content"],
}

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _sb_mock():
    from tests.conftest import make_sb_mock
    return make_sb_mock()


def _patch_auth(partner_ctx=None):
    return patch(
        "services.api.routers.mcp._auth_partner",
        return_value=partner_ctx or PARTNER_CTX,
    )


def _patch_resolve(user_id=None):
    return patch(
        "services.api.routers.mcp._resolve_student",
        return_value=user_id or USER_ID,
    )


def _patch_ensure():
    return patch("services.api.routers.mcp._ensure_mapping")


def _patch_record():
    return patch("services.api.routers.mcp.record_usage")


# ─────────────────────────────────────────────────────────────────────────────
# solve_doubt
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_solve_doubt_returns_answer():
    from services.api.routers.mcp import solve_doubt

    fake_result = {
        "answer": "F = ma is Newton's second law.",
        "sources": [{"content_chunk": "Newton's Laws..."}],
        "related_concepts": ["force", "acceleration"],
        "answer_language": "en",
        "tokens_used": 120,
    }

    sb, chain, _ = _sb_mock()
    # subject lookup returns a dict (maybe_single), session insert returns list
    call_n = 0
    def exe():
        nonlocal call_n
        call_n += 1
        if call_n == 1:   # subjects lookup — return dict with "id"
            return MagicMock(data={"id": str(uuid.uuid4())})
        return MagicMock(data=[{"id": str(uuid.uuid4())}])
    chain.execute.side_effect = lambda: exe()

    with _patch_auth(), _patch_resolve(), _patch_ensure(), _patch_record(), \
         patch("services.api.routers.mcp.get_supabase_service_client", return_value=sb), \
         patch("services.api.routers.mcp.answer_doubt", new=AsyncMock(return_value=fake_result)):

        result = await solve_doubt(
            question="Explain Newton's second law",
            student_id=STUDENT_ID,
            subject="Physics",
            language="en",
            _api_key="vida_live_test",
        )

    assert result["answer"] == fake_result["answer"]
    assert result["tokens_used"] == 120
    assert isinstance(result["sources"], list)


@pytest.mark.asyncio
async def test_solve_doubt_auth_failure_raises():
    from services.api.routers.mcp import solve_doubt

    with patch("services.api.routers.mcp._auth_partner", side_effect=PermissionError("bad key")):
        with pytest.raises(PermissionError):
            await solve_doubt(question="q", student_id="s", _api_key="bad")


# ─────────────────────────────────────────────────────────────────────────────
# get_revision_deck
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_revision_deck_returns_cards():
    from services.api.routers.mcp import get_revision_deck

    fake_deck = {
        "cards": [
            {
                "concept_id": str(uuid.uuid4()),
                "mastery_score": 0.4,
                "scheduled_date": date.today().isoformat(),
                "concepts": {"name": "Kinematics", "subject_id": "phy", "chapter_id": "ch1", "difficulty_level": "Medium"},
            }
        ],
        "total_due": 1,
        "estimated_minutes": 5,
        "new_cards": 0,
        "streak": 3,
    }

    with _patch_auth(), _patch_resolve(), _patch_ensure(), _patch_record(), \
         patch("services.api.routers.mcp.get_todays_deck", new=AsyncMock(return_value=fake_deck)):

        result = await get_revision_deck(
            student_id=STUDENT_ID, exam_type="JEE", _api_key="vida_live_test"
        )

    assert result["total_due"] == 1
    assert len(result["cards"]) == 1
    assert result["cards"][0]["concept_name"] == "Kinematics"


@pytest.mark.asyncio
async def test_get_revision_deck_new_student_empty():
    """Student not yet mapped → empty deck, no error."""
    from services.api.routers.mcp import get_revision_deck

    with _patch_auth(), _patch_ensure(), _patch_record(), \
         patch("services.api.routers.mcp._resolve_student", return_value=None):

        result = await get_revision_deck(
            student_id="brand_new", exam_type="NEET", _api_key="vida_live_test"
        )

    assert result["cards"] == []
    assert result["total_due"] == 0


# ─────────────────────────────────────────────────────────────────────────────
# submit_revision_result
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_submit_revision_result():
    from services.api.routers.mcp import submit_revision_result

    concept_id = str(uuid.uuid4())
    review_result = {
        "next_review_date": date.today(),
        "new_interval_days": 3,
        "new_mastery_state": "reviewing",
    }

    sb, chain, _ = _sb_mock()
    chain.execute.return_value = MagicMock(data=[{"id": str(uuid.uuid4())}])

    with _patch_auth(), _patch_resolve(), _patch_record(), \
         patch("services.api.routers.mcp.get_supabase_service_client", return_value=sb), \
         patch("services.api.routers.mcp.compute_fsrs_update", new=AsyncMock(return_value=review_result)):

        result = await submit_revision_result(
            student_id=STUDENT_ID,
            concept_id=concept_id,
            quality_score=4,
            response_time_ms=1500,
            _api_key="vida_live_test",
        )

    assert result["mastery_state"] == "reviewing"
    assert result["new_interval_days"] == 3
    assert "next_review_date" in result


@pytest.mark.asyncio
async def test_submit_revision_result_unknown_student_raises():
    from services.api.routers.mcp import submit_revision_result

    with _patch_auth(), _patch_record(), \
         patch("services.api.routers.mcp._resolve_student", return_value=None):

        with pytest.raises(ValueError, match="not found"):
            await submit_revision_result(
                student_id="ghost", concept_id=str(uuid.uuid4()),
                quality_score=3, response_time_ms=500, _api_key="vida_live_test",
            )


# ─────────────────────────────────────────────────────────────────────────────
# get_study_plan
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_study_plan_existing_plan():
    from services.api.routers.mcp import get_study_plan

    existing_plan = {
        "plan_date": date.today().isoformat(),
        "slots": [{"subject": "Physics", "hours": 2}],
        "total_hours": 6,
        "completion_percent": 33,
    }

    sb, chain, _ = _sb_mock()
    # First call = fetch existing plan → returns data
    chain.execute.return_value = MagicMock(data=existing_plan)

    with _patch_auth(), _patch_resolve(), _patch_ensure(), _patch_record(), \
         patch("services.api.routers.mcp.get_supabase_service_client", return_value=sb):

        result = await get_study_plan(
            student_id=STUDENT_ID,
            exam_type="JEE",
            exam_date=(date.today().replace(year=date.today().year + 1)).isoformat(),
            _api_key="vida_live_test",
        )

    assert result["plan_date"] == date.today().isoformat()
    assert isinstance(result["slots"], list)


@pytest.mark.asyncio
async def test_get_study_plan_generates_for_new_student():
    from services.api.routers.mcp import get_study_plan

    generated = {
        "today": {
            "slots": [{"subject": "Maths", "hours": 3}],
            "total_hours": 6,
            "completion_percent": 0,
        }
    }

    sb, chain, _ = _sb_mock()
    chain.execute.return_value = MagicMock(data=None)  # no existing plan

    with _patch_auth(), _patch_resolve(), _patch_ensure(), _patch_record(), \
         patch("services.api.routers.mcp.get_supabase_service_client", return_value=sb), \
         patch("services.api.routers.mcp.generate_study_plan", new=AsyncMock(return_value=generated)):

        result = await get_study_plan(
            student_id=STUDENT_ID,
            exam_type="JEE",
            exam_date=(date.today().replace(year=date.today().year + 1)).isoformat(),
            _api_key="vida_live_test",
        )

    assert isinstance(result["slots"], list)


@pytest.mark.asyncio
async def test_get_study_plan_new_student_empty():
    """Unmapped student → empty plan, no exception."""
    from services.api.routers.mcp import get_study_plan

    with _patch_auth(), _patch_ensure(), _patch_record(), \
         patch("services.api.routers.mcp._resolve_student", return_value=None):

        result = await get_study_plan(
            student_id="new_stu", exam_type="NEET",
            exam_date=(date.today().replace(year=date.today().year + 1)).isoformat(),
            _api_key="vida_live_test",
        )

    assert result["slots"] == []
    assert result["total_hours"] == 0


# ─────────────────────────────────────────────────────────────────────────────
# run_mcq_test
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_run_mcq_test_returns_questions():
    from services.api.routers.mcp import run_mcq_test

    fake_qs = [
        {
            "id": str(uuid.uuid4()),
            "question_text": "What is F=ma?",
            "options": {"A": "Force", "B": "Mass", "C": "Acceleration", "D": "Velocity"},
            "subject_id": None,
            "chapter_id": None,
            "difficulty_level": "Medium",
            "year": 2022,
            "source": "JEE",
            "exam_type": "JEE",
        }
    ]

    test_sess_id = str(uuid.uuid4())
    sb, chain, _ = _sb_mock()
    # No subject filter → calls are: study_sessions insert, test_sessions insert
    chain.execute.return_value = MagicMock(data=[{"id": test_sess_id}])

    with _patch_auth(), _patch_resolve(), _patch_ensure(), _patch_record(), \
         patch("services.api.routers.mcp.get_supabase_service_client", return_value=sb), \
         patch("services.api.routers.mcp.fetch_questions", new=AsyncMock(return_value=fake_qs)):

        result = await run_mcq_test(
            student_id=STUDENT_ID,
            exam_type="JEE",
            count=1,
            _api_key="vida_live_test",
        )

    assert "session_id" in result
    assert len(result["questions"]) == 1
    assert result["questions"][0]["question_text"] == "What is F=ma?"
    # correct_option must be stripped from returned questions
    assert "correct_option" not in result["questions"][0]


# ─────────────────────────────────────────────────────────────────────────────
# _auth_partner unit tests (isolated)
# ─────────────────────────────────────────────────────────────────────────────

def test_auth_partner_invalid_key_raises():
    from services.api.routers.mcp import _auth_partner

    sb, chain, _ = _sb_mock()
    chain.execute.return_value = MagicMock(data=None)  # key not found

    with patch("services.api.routers.mcp.get_supabase_service_client", return_value=sb):
        with pytest.raises(PermissionError, match="Invalid or inactive"):
            _auth_partner("vida_live_nonexistent_key")


def test_auth_partner_inactive_key_raises():
    from services.api.routers.mcp import _auth_partner

    sb, chain, _ = _sb_mock()
    chain.execute.return_value = MagicMock(data={"id": KEY_ID, "partner_id": PARTNER_ID, "is_active": False, "expires_at": None})

    with patch("services.api.routers.mcp.get_supabase_service_client", return_value=sb):
        with pytest.raises(PermissionError):
            _auth_partner("vida_live_inactive")


def test_auth_partner_monthly_limit_raises():
    from services.api.routers.mcp import _auth_partner

    sb, chain, _ = _sb_mock()
    call_n = 0

    def side():
        nonlocal call_n
        call_n += 1
        if call_n == 1:  # key row
            return MagicMock(data={"id": KEY_ID, "partner_id": PARTNER_ID, "is_active": True, "expires_at": None})
        # partner org — limit exceeded
        return MagicMock(data={
            "id": PARTNER_ID, "name": "X", "tier": "starter",
            "is_active": True,
            "monthly_call_limit": 100, "calls_used_this_month": 100,
            "allowed_features": ["tutor"],
        })

    chain.execute.side_effect = lambda: side()

    with patch("services.api.routers.mcp.get_supabase_service_client", return_value=sb):
        with pytest.raises(PermissionError, match="Monthly call limit"):
            _auth_partner("vida_live_over_limit")


# ─────────────────────────────────────────────────────────────────────────────
# _resolve_student unit tests
# ─────────────────────────────────────────────────────────────────────────────

def test_resolve_student_returns_uuid_when_mapped():
    from services.api.routers.mcp import _resolve_student

    expected = str(uuid.uuid4())
    sb, chain, _ = _sb_mock()
    chain.execute.return_value = MagicMock(data={"vidyai_user_id": expected})

    with patch("services.api.routers.mcp.get_supabase_service_client", return_value=sb):
        result = _resolve_student(PARTNER_ID, STUDENT_ID)

    assert result == uuid.UUID(expected)


def test_resolve_student_returns_none_when_not_mapped():
    from services.api.routers.mcp import _resolve_student

    sb, chain, _ = _sb_mock()
    chain.execute.return_value = MagicMock(data=None)

    with patch("services.api.routers.mcp.get_supabase_service_client", return_value=sb):
        result = _resolve_student(PARTNER_ID, "unknown_student")

    assert result is None
