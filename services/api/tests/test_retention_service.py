"""Unit tests for the retention (FSRS/SM-2) service logic."""
import pytest
import uuid
from unittest.mock import patch, MagicMock
from datetime import date

from services.api.services.retention_service import (
    _sm2_update,
    _quality_to_mastery,
    _score_to_state,
    _compute_priority,
)


def test_sm2_first_correct():
    interval, ef, stability = _sm2_update(quality_score=4, repetitions=0, interval=0, ef=2.5)
    assert interval == 1
    assert ef >= 2.5  # good quality shouldn't reduce ef


def test_sm2_second_correct():
    interval, ef, stability = _sm2_update(quality_score=5, repetitions=1, interval=1, ef=2.5)
    assert interval == 6


def test_sm2_third_correct():
    interval, ef, stability = _sm2_update(quality_score=4, repetitions=2, interval=6, ef=2.5)
    assert interval > 6  # should grow


def test_sm2_failed_resets():
    interval, ef, stability = _sm2_update(quality_score=2, repetitions=5, interval=30, ef=2.5)
    assert interval == 1
    assert ef < 2.5  # failed should reduce ef


def test_sm2_ef_minimum():
    interval, ef, stability = _sm2_update(quality_score=0, repetitions=3, interval=10, ef=1.31)
    assert ef >= 1.3  # never below 1.3


def test_quality_to_mastery_increase():
    score = _quality_to_mastery(5, 0.5)
    assert score > 0.5


def test_quality_to_mastery_decrease():
    score = _quality_to_mastery(0, 0.5)
    assert score < 0.5


def test_quality_to_mastery_clamp():
    score = _quality_to_mastery(5, 0.99)
    assert score <= 1.0
    score2 = _quality_to_mastery(0, 0.01)
    assert score2 >= 0.0


def test_score_to_state_mastered():
    assert _score_to_state(0.85, 4) == "mastered"


def test_score_to_state_reviewing():
    assert _score_to_state(0.6, 3) == "reviewing"


def test_score_to_state_learning():
    assert _score_to_state(0.2, 3) == "learning"


def test_score_to_state_forgotten():
    assert _score_to_state(0.5, 0) == "forgotten"


def test_compute_priority_low_mastery():
    p = _compute_priority(0.1, 1)
    assert p > 50  # high urgency for low mastery


def test_compute_priority_high_mastery():
    p = _compute_priority(0.95, 30)
    assert p < 10  # low urgency for well-mastered concepts
