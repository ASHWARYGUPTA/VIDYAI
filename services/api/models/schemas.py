import uuid
from datetime import date, datetime
from typing import Any
from pydantic import BaseModel, Field
from enum import Enum


# ── Enums ────────────────────────────────────────────────────────────────────

class ExamType(str, Enum):
    JEE = "JEE"
    NEET = "NEET"
    UPSC = "UPSC"

class SubjectType(str, Enum):
    Physics = "Physics"
    Chemistry = "Chemistry"
    Biology = "Biology"
    Mathematics = "Mathematics"
    History = "History"
    Geography = "Geography"
    Polity = "Polity"
    Economy = "Economy"
    Environment = "Environment"
    Current_Affairs = "Current_Affairs"

class DifficultyLevel(str, Enum):
    Easy = "Easy"
    Medium = "Medium"
    Hard = "Hard"

class MasteryState(str, Enum):
    unseen = "unseen"
    learning = "learning"
    reviewing = "reviewing"
    mastered = "mastered"
    forgotten = "forgotten"

class SubscriptionTier(str, Enum):
    free = "free"
    pro = "pro"
    enterprise = "enterprise"

class ContentStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"

class Language(str, Enum):
    en = "en"
    hi = "hi"
    hinglish = "hinglish"


# ── Auth ─────────────────────────────────────────────────────────────────────

class OnboardRequest(BaseModel):
    full_name: str
    phone: str | None = None
    exam_target: ExamType
    exam_date: date | None = None
    current_class: str | None = Field(default=None, pattern="^(11|12|dropper|graduate)$")
    daily_study_hours: int = Field(default=6, ge=1, le=16)
    preferred_language: Language = Language.en

class ProfileUpdateRequest(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    exam_date: date | None = None
    daily_study_hours: int | None = Field(default=None, ge=1, le=16)
    preferred_language: Language | None = None
    avatar_url: str | None = None

class SubscriptionCreateRequest(BaseModel):
    plan: str = Field(..., pattern="^(pro|enterprise)$")
    coupon: str | None = None


# ── Tutor ────────────────────────────────────────────────────────────────────

class AskRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=2000)
    subject_id: uuid.UUID | None = None
    chapter_id: uuid.UUID | None = None
    language: Language = Language.en
    session_id: uuid.UUID | None = None
    parent_doubt_id: uuid.UUID | None = None

class Source(BaseModel):
    title: str
    chapter: str
    page: int | None = None
    excerpt: str

class AskResponse(BaseModel):
    doubt_id: uuid.UUID
    answer: str
    answer_language: str
    sources: list[Source]
    related_concepts: list[dict]
    follow_up_suggestions: list[str]
    tokens_used: int
    latency_ms: int

class FeedbackRequest(BaseModel):
    was_helpful: bool


# ── Retention ────────────────────────────────────────────────────────────────

class ReviewRequest(BaseModel):
    concept_id: uuid.UUID
    quality_score: int = Field(..., ge=0, le=5)
    response_time_ms: int = Field(default=0, ge=0)
    session_id: uuid.UUID | None = None
    hint_used: bool = False

class ReviewResponse(BaseModel):
    next_review_date: date
    new_interval_days: int
    new_mastery_state: MasteryState
    new_mastery_score: float
    ease_factor: float
    xp_earned: int

class BatchReviewRequest(BaseModel):
    reviews: list[ReviewRequest]
    session_id: uuid.UUID

class FreezeResponse(BaseModel):
    tokens_remaining: int
    streak_protected: bool


# ── Planner ──────────────────────────────────────────────────────────────────

class GeneratePlanRequest(BaseModel):
    exam_type: ExamType | None = None
    exam_date: date | None = None
    daily_hours: int | None = Field(default=None, ge=1, le=16)
    excluded_dates: list[date] = []
    priority_subjects: list[SubjectType] = []
    weak_subjects: list[SubjectType] = []
    force_regenerate: bool = False

class SlotUpdateRequest(BaseModel):
    status: str = Field(..., pattern="^(completed|skipped)$")
    actual_minutes: int | None = None

class RebalanceRequest(BaseModel):
    reason: str | None = None

class PlanConfigRequest(BaseModel):
    daily_hours: int | None = Field(default=None, ge=1, le=16)
    excluded_dates: list[date] | None = None
    priority_subjects: list[SubjectType] | None = None


# ── MCQ ──────────────────────────────────────────────────────────────────────

class StartTestRequest(BaseModel):
    exam_type: ExamType
    subject_id: uuid.UUID | None = None
    chapter_id: uuid.UUID | None = None
    question_count: int = Field(..., pattern=None, ge=5, le=50)
    duration_minutes: int = Field(default=60, ge=10, le=180)
    mode: str = Field(..., pattern="^(pyq|practice|adaptive|chapter_test)$")
    pyq_year_range: tuple[int, int] | None = None
    difficulty: DifficultyLevel | None = None

class AnswerRequest(BaseModel):
    test_session_id: uuid.UUID
    question_id: uuid.UUID
    selected_option: str = Field(..., pattern="^(A|B|C|D|skipped)$")
    time_spent_ms: int = Field(..., ge=0)

class SubmitTestRequest(BaseModel):
    test_session_id: uuid.UUID


# ── Content ──────────────────────────────────────────────────────────────────

class ProcessVideoRequest(BaseModel):
    youtube_url: str = Field(..., min_length=10)
    output_language: str = Field(default="en", pattern="^(en|hi)$")
    generate_dub: bool = False
    subject_id: uuid.UUID | None = None
    chapter_id: uuid.UUID | None = None
