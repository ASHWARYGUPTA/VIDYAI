╔══════════════════════════════════════════════════════════════════════════════════╗
║ VIDYAI — MASTER APPLICATION CONTEXT PROMPT ║
║ Paste this at the start of every coding session / AI chat ║
╚══════════════════════════════════════════════════════════════════════════════════╝

You are a senior full-stack engineer working on VidyAI — an AI-powered,
retention-first learning platform for Indian competitive exam students
(JEE, NEET, UPSC). Read this entire context before writing any code.
Never deviate from the architecture, naming conventions, or data contracts
described here.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 1 — PRODUCT OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Product name : VidyAI
Tagline : "Nothing forgotten. Everything mastered."
Target users : JEE / NEET / UPSC aspirants (age 16–28, India)
Core philosophy: The system must remember what each student studied, adapt to
their pace, and act autonomously to ensure nothing is forgotten.
It goes beyond content delivery into proactive cognitive companionship.

TWO BUSINESS TRACKS:
Track 1 (B2C) — vidyai.in
A direct student portal where users sign up, access all 5 features,
subscribe via Razorpay (Free / Pro plans), and study daily.

Track 2 (B2B / MCP) — api.vidyai.in/mcp
An MCP (Model Context Protocol) API that edtech companies (PhysicsWallah,
Udemy India, Unacademy, etc.) embed into their own LLM agents to get
VidyAI's AI features as a managed service. Billed via Stripe per call.
Partners never build RAG, retention engines, or study planners themselves —
they call VidyAI's MCP tools instead.

FIVE CORE FEATURES:
F1 — AI Tutor : RAG-grounded doubt solver, NCERT-sourced, Hindi/Hinglish voice
F2 — Retention Engine : FSRS forgetting-curve scheduler + dynamic knowledge graph
F3 — Study Planner : LangChain agent generating & auto-rebalancing daily plans
F4 — MCQ / PYQ Tests : Adaptive test engine with JEE/NEET/UPSC past year questions
F5 — Content Processor: YouTube → transcript → structured notes → Hindi dub/subtitle

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 2 — TECH STACK (CANONICAL, DO NOT SUBSTITUTE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FRONTEND
Framework : Next.js 14 (App Router, TypeScript strict mode)
Styling : Tailwind CSS + shadcn/ui component library
State : Zustand (client), TanStack Query v5 (server state)
Charts : Recharts (heatmap, progress, analytics)
Auth client : @supabase/auth-helpers-nextjs
Voice : Web Speech API (STT) + custom TTS audio player
Realtime : Supabase Realtime (live doubt sessions)
PWA : next-pwa (offline flashcard deck, push notifications)
Deployment : Vercel (automatic preview + production deploys)

BACKEND
Framework : FastAPI (Python 3.11, async throughout)
Server : Uvicorn + Gunicorn (4 workers in prod)
AI/LLM : LangChain 0.2 (chains, agents, output parsers)
LLM providers : Anthropic Claude 3.5 Sonnet (primary), OpenAI GPT-4o (fallback)
Embeddings : OpenAI text-embedding-ada-002 (1536 dimensions)
Voice STT : OpenAI Whisper API
Voice TTS : Sarvam AI (Hindi/Hinglish), OpenAI TTS (English)
Task queue : Celery 5 + Redis (async workers for video processing, nightly scheduler)
MCP server : FastMCP (Python) — mounted as FastAPI router at /mcp
Deployment : Railway (FastAPI + Celery worker as separate services)

DATABASE & STORAGE
Primary DB : Supabase (PostgreSQL 15)
Vector store : pgvector extension on Supabase (same DB, no separate service)
Cache/Queue : Redis (Upstash managed — also used as Celery broker)
File storage : Supabase Storage (thumbnails, audio) + AWS S3 (video transcripts,
dubbed audio, large processed outputs)
Search : pg_trgm extension for full-text question search

AUTH & BILLING
Authentication: Supabase Auth (JWT, magic link, Google OAuth)
B2C billing : Razorpay (INR subscriptions, UPI support)
B2B billing : Stripe (USD, partner API metering)
API auth : Bearer token (JWT for B2C), API key hash (B2B partners)

OBSERVABILITY
Error tracking: Sentry (both frontend and backend)
APM : Datadog (backend latency, Celery queue depth)
Logging : Structured JSON logs via Python logging → Datadog
CI/CD : GitHub Actions → Vercel (frontend) + Railway (backend)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 3 — MONOREPO STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

vidyai/
├── apps/
│ ├── web/ # Next.js 14 student portal (Track 1)
│ │ ├── app/
│ │ │ ├── (auth)/ # login, signup, onboarding
│ │ │ ├── (dashboard)/
│ │ │ │ ├── dashboard/ # home with daily plan + streak
│ │ │ │ ├── tutor/ # AI doubt solver chat UI
│ │ │ │ ├── revision/ # today's flashcard deck
│ │ │ │ ├── planner/ # weekly/daily study plan view
│ │ │ │ ├── tests/ # MCQ test interface
│ │ │ │ ├── progress/ # heatmap + analytics
│ │ │ │ └── content/ # YouTube processor
│ │ │ └── api/ # Next.js route handlers (thin proxies only)
│ │ ├── components/
│ │ │ ├── ui/ # shadcn primitives
│ │ │ ├── tutor/ # ChatWindow, VoiceInput, SourceCitation
│ │ │ ├── revision/ # FlashCard, DeckProgress, MasteryBadge
│ │ │ ├── planner/ # DailyPlanCard, WeekCalendar, SubjectSlot
│ │ │ ├── tests/ # QuestionCard, OptionButton, TestTimer
│ │ │ └── analytics/ # HeatmapGrid, SubjectRadar, WeeklyChart
│ │ ├── lib/
│ │ │ ├── supabase/ # client.ts, server.ts, middleware.ts
│ │ │ ├── api/ # typed API client (wraps fetch to FastAPI)
│ │ │ └── stores/ # Zustand stores
│ │ └── public/
│ │
│ └── partner-sdk/ # npm package for B2B partners (Track 2)
│ ├── src/
│ │ ├── client.ts # VidyAIClient class
│ │ ├── tools/ # solvDoubt, scheduleRevision, etc.
│ │ └── types.ts # shared TypeScript types
│ └── package.json
│
├── services/
│ └── api/ # FastAPI backend
│ ├── main.py # app factory, router mounting
│ ├── config.py # pydantic Settings (env vars)
│ ├── dependencies.py # get_db, get_current_user, get_partner
│ ├── routers/
│ │ ├── tutor.py # /api/v1/tutor/_
│ │ ├── retention.py # /api/v1/retention/_
│ │ ├── planner.py # /api/v1/planner/_
│ │ ├── mcq.py # /api/v1/mcq/_
│ │ ├── content.py # /api/v1/content/_
│ │ ├── progress.py # /api/v1/progress/_
│ │ ├── auth.py # /api/v1/auth/\*
│ │ └── mcp.py # /mcp (FastMCP server)
│ ├── services/
│ │ ├── tutor_service.py # LangChain RAG chain
│ │ ├── retention_service.py # FSRS algorithm, scheduler
│ │ ├── planner_service.py # LangChain agent
│ │ ├── mcq_service.py # test session management
│ │ ├── content_service.py # yt-dlp + Whisper + notes gen
│ │ ├── voice_service.py # Whisper STT + Sarvam TTS
│ │ └── embedding_service.py # OpenAI ada-002 wrapper
│ ├── models/
│ │ ├── database.py # SQLAlchemy ORM models
│ │ └── schemas.py # Pydantic request/response schemas
│ ├── workers/
│ │ ├── celery_app.py # Celery instance + beat schedule
│ │ ├── scheduler_worker.py # nightly revision scheduler
│ │ ├── planner_worker.py # nightly plan rebalancer
│ │ └── video_worker.py # async video processing pipeline
│ └── utils/
│ ├── supabase_client.py # service-role Supabase client
│ ├── hallucination_guard.py# citation enforcer for RAG outputs
│ └── usage_meter.py # partner call counting
│
├── packages/
│ └── shared-types/ # TypeScript types shared across apps
│ └── src/index.ts
│
├── supabase/
│ ├── migrations/ # SQL migration files (sequential)
│ └── seed/ # seed data for dev
│
└── infra/
├── .github/workflows/ # CI/CD pipelines
└── docker-compose.yml # local dev stack

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 4 — COMPLETE DATABASE SCHEMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All tables live in Supabase PostgreSQL.
All PKs are uuid DEFAULT uuid_generate_v4().
All tables have created_at timestamptz DEFAULT now() and updated_at timestamptz.
RLS is enabled on all student-facing tables.

── ENUMS ───────────────────────────────────────────────────────────────────────
exam_type : JEE | NEET | UPSC
subject_type : Physics | Chemistry | Biology | Mathematics |
History | Geography | Polity | Economy | Environment | Current_Affairs
difficulty_level : Easy | Medium | Hard
mastery_state : unseen | learning | reviewing | mastered | forgotten
session_type : study | revision | test | doubt
plan_status : active | paused | completed
subscription_tier : free | pro | enterprise
notification_type : revision_due | plan_update | streak_milestone | test_reminder
content_status : pending | processing | completed | failed
partner_tier : starter | growth | enterprise

── MODULE 1: USER & AUTH ────────────────────────────────────────────────────────
profiles
id uuid PK (mirrors auth.users.id)
full_name text
email text UNIQUE NOT NULL
phone text
avatar_url text
preferred_language text DEFAULT 'en' -- en | hi | hinglish
exam_target exam_type NOT NULL
exam_date date
current_class text -- '11' | '12' | 'dropper' | 'graduate'
daily_study_hours integer DEFAULT 6
subscription_tier subscription_tier DEFAULT 'free'
streak_count integer DEFAULT 0
last_active_date date
timezone text DEFAULT 'Asia/Kolkata'
onboarding_completed boolean DEFAULT false
metadata jsonb DEFAULT '{}'

subscriptions
id uuid PK
user_id uuid FK → profiles
tier subscription_tier
started_at timestamptz
expires_at timestamptz
razorpay_subscription_id text
is_active boolean DEFAULT true
metadata jsonb

── MODULE 2: SYLLABUS GRAPH ─────────────────────────────────────────────────────
subjects
id uuid PK
name subject_type NOT NULL
exam_types exam_type[]
display_order integer
description text

chapters
id uuid PK
subject_id uuid FK → subjects
name text NOT NULL
exam_types exam_type[]
chapter_number integer
total_concepts integer DEFAULT 0
weightage_percent numeric(5,2)
description text
metadata jsonb

concepts
id uuid PK
chapter_id uuid FK → chapters
subject_id uuid FK → subjects
name text NOT NULL
description text
difficulty_level difficulty_level DEFAULT 'Medium'
exam_relevance exam_type[]
prerequisite_concept_ids uuid[]
related_concept_ids uuid[]
ncert_reference text -- "Class 12 Physics Ch1 P14"
tags text[]
embedding vector(1536) -- pgvector, ada-002
metadata jsonb

── MODULE 3: LEARNER KNOWLEDGE GRAPH ────────────────────────────────────────────
learner_concept_states
id uuid PK
user_id uuid FK → profiles
concept_id uuid FK → concepts
mastery_state mastery_state DEFAULT 'unseen'
mastery_score numeric(4,3) DEFAULT 0.0 -- 0.0 to 1.0
ease_factor numeric(4,3) DEFAULT 2.5 -- SM-2 EF, min 1.3
interval_days integer DEFAULT 0
repetition_count integer DEFAULT 0
next_review_date date
last_reviewed_at timestamptz
total_attempts integer DEFAULT 0
correct_attempts integer DEFAULT 0
average_response_ms integer
stability numeric(8,4) -- FSRS S parameter
difficulty_fsrs numeric(4,3) -- FSRS D parameter
retrievability numeric(4,3) -- FSRS R parameter
response_history jsonb DEFAULT '[]' -- [{ts, q_score, latency_ms}]
UNIQUE (user_id, concept_id)

learner_chapter_progress
id uuid PK
user_id uuid FK → profiles
chapter_id uuid FK → chapters
concepts_seen integer DEFAULT 0
concepts_mastered integer DEFAULT 0
completion_percent numeric(5,2) DEFAULT 0
last_studied_at timestamptz
time_spent_minutes integer DEFAULT 0

── MODULE 4: STUDY SESSIONS & EVENTS ────────────────────────────────────────────
study_sessions
id uuid PK
user_id uuid FK → profiles
session_type session_type NOT NULL
started_at timestamptz NOT NULL
ended_at timestamptz
duration_minutes integer
subject_id uuid FK → subjects (nullable)
chapter_id uuid FK → chapters (nullable)
concepts_covered uuid[]
cards_reviewed integer DEFAULT 0
cards_correct integer DEFAULT 0
xp_earned integer DEFAULT 0
metadata jsonb

concept_interaction_events
id uuid PK
user_id uuid FK → profiles
session_id uuid FK → study_sessions
concept_id uuid FK → concepts
event_type text CHECK IN ('view','quiz_attempt','revision','doubt_asked')
quality_score integer CHECK (0–5) -- SM-2 q score
response_time_ms integer
was_correct boolean
hint_used boolean DEFAULT false
created_at timestamptz DEFAULT now()

── MODULE 5: REVISION SCHEDULER ─────────────────────────────────────────────────
revision_queue
id uuid PK
user_id uuid FK → profiles
concept_id uuid FK → concepts
scheduled_date date NOT NULL
priority_score numeric(8,4) -- composite urgency score
is_completed boolean DEFAULT false
completed_at timestamptz
session_id uuid FK → study_sessions (nullable)
INDEX (user_id, scheduled_date) WHERE is_completed = false

revision_streaks
id uuid PK
user_id uuid FK → profiles UNIQUE
current_streak integer DEFAULT 0
longest_streak integer DEFAULT 0
last_revision_date date
total_revision_days integer DEFAULT 0
freeze_tokens_remaining integer DEFAULT 2

── MODULE 6: STUDY PLANNER ──────────────────────────────────────────────────────
study_plans
id uuid PK
user_id uuid FK → profiles
exam_type exam_type NOT NULL
exam_date date NOT NULL
status plan_status DEFAULT 'active'
total_weeks integer
current_week integer DEFAULT 1
syllabus_coverage_percent numeric(5,2) DEFAULT 0
weak_subjects subject_type[]
strong_subjects subject_type[]
daily_revision_slots integer DEFAULT 2
plan_config jsonb -- weights, priorities, excluded dates
last_rebalanced_at timestamptz
rebalance_reason text

daily_study_plans
id uuid PK
plan_id uuid FK → study_plans
user_id uuid FK → profiles
plan_date date NOT NULL
total_hours numeric(4,2)
is_completed boolean DEFAULT false
completion_percent numeric(5,2) DEFAULT 0
slots jsonb NOT NULL
-- [{subject, chapter_id, concept_ids[], duration_minutes, type: new|revision|test}]
actual_start_time timestamptz
actual_end_time timestamptz
UNIQUE (user_id, plan_date)

── MODULE 7: MCQ / PYQ ENGINE ───────────────────────────────────────────────────
questions
id uuid PK
subject_id uuid FK → subjects
chapter_id uuid FK → chapters
concept_ids uuid[]
exam_type exam_type NOT NULL
exam_year integer -- null if not PYQ
exam_paper text -- "JEE Mains Jan 2023 Paper 1"
question_text text NOT NULL
question_text_hindi text
option_a text NOT NULL
option_b text NOT NULL
option_c text NOT NULL
option_d text NOT NULL
correct_option text CHECK IN ('A','B','C','D')
explanation text
explanation_hindi text
difficulty_level difficulty_level
is_pyq boolean DEFAULT false
marks_positive numeric(4,2) DEFAULT 4
marks_negative numeric(4,2) DEFAULT 1
embedding vector(1536)
tags text[]
source text
verified boolean DEFAULT false
metadata jsonb

test_sessions
id uuid PK
user_id uuid FK → profiles
session_id uuid FK → study_sessions
exam_type exam_type NOT NULL
subject_id uuid FK → subjects (nullable)
chapter_id uuid FK → chapters (nullable)
question_ids uuid[] NOT NULL
total_questions integer
duration_minutes integer DEFAULT 60
started_at timestamptz
submitted_at timestamptz
score numeric(6,2)
max_score numeric(6,2)
percentile numeric(5,2)
time_per_question jsonb -- {question_id: ms}
is_adaptive boolean DEFAULT false
metadata jsonb

test_answers
id uuid PK
test_session_id uuid FK → test_sessions
question_id uuid FK → questions
user_id uuid FK → profiles
selected_option text CHECK IN ('A','B','C','D','skipped')
is_correct boolean
marks_awarded numeric(4,2)
time_spent_ms integer
was_reviewed boolean DEFAULT false

── MODULE 8: AI TUTOR ───────────────────────────────────────────────────────────
doubt_sessions
id uuid PK
user_id uuid FK → profiles
session_id uuid FK → study_sessions
question_text text NOT NULL
question_language text DEFAULT 'en'
question_audio_url text -- S3 URL if voice input
subject_id uuid FK → subjects
chapter_id uuid FK → chapters
related_concept_ids uuid[]
answer_text text
answer_language text DEFAULT 'en'
answer_audio_url text -- TTS output S3 URL
sources jsonb -- [{title, chapter, page, excerpt}]
rag_chunks_used integer
llm_model text
tokens_used integer
latency_ms integer
was_helpful boolean
follow_up_count integer DEFAULT 0
parent_doubt_id uuid FK → doubt_sessions -- for follow-up threads

ncert_content_chunks
id uuid PK
subject_id uuid FK → subjects
chapter_id uuid FK → chapters
source_title text NOT NULL -- "NCERT Physics Class 12"
source_page integer
chunk_index integer
content text NOT NULL
content_hindi text
embedding vector(1536) NOT NULL
token_count integer
INDEX: IVFFlat on embedding with lists=100, vector_cosine_ops

── MODULE 9: CONTENT PROCESSOR ──────────────────────────────────────────────────
processed_videos
id uuid PK
user_id uuid FK → profiles
youtube_url text NOT NULL
youtube_video_id text NOT NULL
title text
channel text
duration_seconds integer
language_detected text
transcript_raw text
transcript_hindi text
structured_notes jsonb
-- [{heading, content, concepts_tagged: uuid[], timestamp_seconds}]
summary text
key_concepts uuid[]
audio_dubbed_url text -- S3 URL
thumbnail_url text
processing_status content_status DEFAULT 'pending'
processing_started_at timestamptz
processing_completed_at timestamptz
error_message text
job_id text UNIQUE -- Celery task ID

── MODULE 10: NOTIFICATIONS ─────────────────────────────────────────────────────
notification_preferences
id uuid PK
user_id uuid FK → profiles UNIQUE
revision_reminders boolean DEFAULT true
revision_time time DEFAULT '08:00'
test_reminders boolean DEFAULT true
streak_alerts boolean DEFAULT true
plan_updates boolean DEFAULT true
push_enabled boolean DEFAULT false
email_enabled boolean DEFAULT true
whatsapp_enabled boolean DEFAULT false
fcm_token text

notifications
id uuid PK
user_id uuid FK → profiles
type notification_type
title text NOT NULL
body text NOT NULL
data jsonb -- deep-link payload
is_read boolean DEFAULT false
sent_at timestamptz
read_at timestamptz
channel text CHECK IN ('push','email','whatsapp','in_app')

── MODULE 11: ANALYTICS ─────────────────────────────────────────────────────────
daily_activity_heatmap
id uuid PK
user_id uuid FK → profiles
activity_date date NOT NULL
study_minutes integer DEFAULT 0
cards_reviewed integer DEFAULT 0
questions_attempted integer DEFAULT 0
doubts_asked integer DEFAULT 0
xp_earned integer DEFAULT 0
subjects_covered subject_type[]
UNIQUE (user_id, activity_date)

weekly_performance_snapshots
id uuid PK
user_id uuid FK → profiles
week_start date NOT NULL
overall_score numeric(5,2)
subject_scores jsonb -- {subject: score}
concepts_mastered integer DEFAULT 0
revision_completion_rate numeric(5,2)
test_accuracy numeric(5,2)
weak_concepts uuid[]
strong_concepts uuid[]
UNIQUE (user_id, week_start)

── MODULE 12: MCP / PARTNER LAYER ───────────────────────────────────────────────
partner_organizations
id uuid PK
name text NOT NULL
slug text UNIQUE NOT NULL
website text
contact_email text NOT NULL
tier partner_tier DEFAULT 'starter'
monthly_call_limit integer DEFAULT 50000
calls_used_this_month integer DEFAULT 0
billing_cycle_start date
stripe_customer_id text
is_active boolean DEFAULT true
allowed_features text[] -- ['tutor','retention','planner','mcq','content']
webhook_url text
metadata jsonb

partner_api_keys
id uuid PK
partner_id uuid FK → partner_organizations
key_hash text UNIQUE NOT NULL -- bcrypt hash
key_prefix text NOT NULL -- "vida_live_ab12" (shown in dashboard)
name text
is_active boolean DEFAULT true
last_used_at timestamptz
total_calls integer DEFAULT 0
expires_at timestamptz
scopes text[] -- ['tutor:read','retention:write',...]

partner_api_usage
id uuid PK
partner_id uuid FK → partner_organizations
api_key_id uuid FK → partner_api_keys
tool_name text NOT NULL
called_at timestamptz DEFAULT now()
latency_ms integer
tokens_used integer
status_code integer
error_message text
request_metadata jsonb
INDEX (partner_id, called_at DESC)

partner_student_mappings
id uuid PK
partner_id uuid FK → partner_organizations
external_student_id text NOT NULL -- ID from partner's system
vidyai_user_id uuid FK → profiles (nullable)
exam_type exam_type
UNIQUE (partner_id, external_student_id)

── MODULE 13: GAMIFICATION ──────────────────────────────────────────────────────
xp_ledger
id uuid PK
user_id uuid FK → profiles
amount integer NOT NULL
reason text NOT NULL
session_id uuid (nullable)
metadata jsonb
created_at timestamptz DEFAULT now()

badges
id uuid PK
name text UNIQUE NOT NULL
description text
icon_url text
criteria jsonb
xp_reward integer DEFAULT 0

user_badges
id uuid PK
user_id uuid FK → profiles
badge_id uuid FK → badges
earned_at timestamptz DEFAULT now()
UNIQUE (user_id, badge_id)

── KEY INDEXES ──────────────────────────────────────────────────────────────────
learner_concept_states : (user_id, next_review_date)
learner_concept_states : (user_id, mastery_state)
revision_queue : (user_id, scheduled_date) WHERE is_completed = false
concept_interaction_events: (user_id, created_at DESC)
daily_activity_heatmap : (user_id, activity_date DESC)
questions : (exam_type, subject_id, difficulty_level)
questions : (is_pyq, exam_year, exam_type)
ncert_content_chunks : IVFFlat on embedding (vector_cosine_ops, lists=100)
concepts : IVFFlat on embedding (vector_cosine_ops, lists=100)
partner_api_usage : (partner_id, called_at DESC)
doubt_sessions : (user_id, created_at DESC)

── RLS POLICIES ─────────────────────────────────────────────────────────────────
Student tables (profiles, learner_concept_states, study_sessions, test_sessions,
test_answers, doubt_sessions, daily_activity_heatmap, revision_queue,
daily_study_plans, notifications):
SELECT : auth.uid() = user_id
INSERT : auth.uid() = user_id
UPDATE : auth.uid() = user_id
DELETE : disabled on audit tables

Partner tables (partner_api_keys, partner_api_usage):
All access via service_role key only (FastAPI backend) — no user RLS.

── KEY POSTGRES FUNCTIONS ───────────────────────────────────────────────────────
get_due_cards(p_user_id, p_date, p_limit)
→ learner_concept_states JOIN concepts
WHERE next_review_date <= p_date AND mastery_state != 'mastered'
ORDER BY (p_date - next_review_date) DESC, mastery_score ASC
LIMIT p_limit

update_chapter_progress(p_user_id, p_chapter_id)
→ recalculates and upserts learner_chapter_progress

update_daily_heatmap(p_user_id, p_date, study_minutes, cards, questions)
→ INSERT ... ON CONFLICT DO UPDATE (atomic upsert)

increment_partner_usage(p_partner_id, p_tool_name, p_tokens)
→ atomically increments calls_used_this_month + inserts usage row

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 5 — COMPLETE API REFERENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Base URL : https://api.vidyai.in
Version : /api/v1/
Auth : Authorization: Bearer <supabase_jwt> (B2C)
Authorization: Bearer <api_key> (B2B MCP)

All endpoints return:
200 OK with data payload
400 Bad Request { error: string, details?: object }
401 Unauthorized { error: "invalid_token" }
402 Payment Required { error: "subscription_required", feature: string }
422 Validation Error (FastAPI default)
429 Too Many Requests { error: "rate_limit", retry_after: seconds }
500 Internal Server Error

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROUTER 1 — AUTH /api/v1/auth
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POST /api/v1/auth/onboard
Description : Complete onboarding after first Supabase sign-in
Auth : Bearer JWT
Body : {
full_name: string,
phone?: string,
exam_target: ExamType,
exam_date: date,
current_class: string,
daily_study_hours: integer,
preferred_language: 'en'|'hi'|'hinglish'
}
Response : { profile: Profile, plan_id: uuid }
Side effects: Creates profile row, generates initial study_plan,
seeds learner_concept_states for top 20 concepts

GET /api/v1/auth/profile
Description : Get current user's full profile
Response : { profile: Profile, subscription: Subscription|null,
streak: RevisionStreak }

PATCH /api/v1/auth/profile
Description : Update profile fields
Body : Partial<Profile>
Response : { profile: Profile }

GET /api/v1/auth/subscription
Description : Get current subscription status
Response : { tier: SubscriptionTier, expires_at: date|null,
features_unlocked: string[] }

POST /api/v1/auth/subscription/create
Description : Create Razorpay subscription
Body : { plan: 'pro' | 'enterprise', coupon?: string }
Response : { razorpay_order_id: string, razorpay_key: string }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROUTER 2 — AI TUTOR /api/v1/tutor
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POST /api/v1/tutor/ask
Description : Submit a doubt question (text)
Rate limit : 10/day (free), unlimited (pro)
Body : {
question: string,
subject_id?: uuid,
chapter_id?: uuid,
language?: 'en'|'hi'|'hinglish',
session_id?: uuid,
parent_doubt_id?: uuid
}
Response : {
doubt_id: uuid,
answer: string,
answer_language: string,
sources: Source[], -- [{title, chapter, page, excerpt}]
related_concepts: Concept[],
follow_up_suggestions: string[],
tokens_used: integer,
latency_ms: integer
}
Pipeline : question → embedding → pgvector similarity search (top 5 NCERT chunks)
→ LangChain RAG chain (Claude 3.5 Sonnet) → citation enforcer
→ save doubt_session → update concept_interaction_events

POST /api/v1/tutor/ask-voice
Description : Submit a doubt via audio (multipart upload)
Rate limit : 5/day (free), 50/day (pro)
Body : multipart/form-data { audio: File, language?: string,
subject_id?: uuid, session_id?: uuid }
Response : same as /ask + { transcript: string, audio_answer_url: string }
Pipeline : audio → Whisper STT → /ask internally → Sarvam TTS → S3 upload

GET /api/v1/tutor/history
Query params: limit=20&offset=0&subject_id=uuid
Response : { doubts: DoubtSession[], total: integer }

GET /api/v1/tutor/doubt/:doubt_id
Response : { doubt: DoubtSession }

POST /api/v1/tutor/doubt/:doubt_id/feedback
Body : { was_helpful: boolean }
Response : { success: true }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROUTER 3 — RETENTION ENGINE /api/v1/retention
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET /api/v1/retention/deck/today
Description : Get today's revision deck
Query params: limit=30&include_new=true
Response : {
cards: RevisionCard[], -- sorted by priority_score
total_due: integer,
new_cards: integer,
estimated_minutes: integer
}

POST /api/v1/retention/review
Description : Submit review result for one concept (updates FSRS params)
Body : {
concept_id: uuid,
quality_score: integer, -- 0–5 (SM-2 q)
response_time_ms: integer,
session_id: uuid,
hint_used?: boolean
}
Response : {
next_review_date: date,
new_interval_days: integer,
new_mastery_state: MasteryState,
new_mastery_score: float,
ease_factor: float,
xp_earned: integer
}
Side effects: Updates learner_concept_states, inserts concept_interaction_events,
updates revision_queue, updates daily_activity_heatmap

POST /api/v1/retention/review/batch
Description : Submit multiple reviews at end of session
Body : { reviews: ReviewResult[], session_id: uuid }
Response : { updated: integer, xp_earned: integer, streak: RevisionStreak }

GET /api/v1/retention/knowledge-graph
Description : Get the student's full concept mastery map
Query params: subject_id=uuid&mastery_state=learning|forgotten|all
Response : {
concepts: LearnerConceptState[],
summary: { mastered: int, learning: int, unseen: int, forgotten: int }
}

GET /api/v1/retention/weak-areas
Description : Top N weakest concepts for targeted revision
Query params: limit=10&subject_id=uuid
Response : { weak_concepts: ConceptWithMastery[], by_chapter: ChapterGap[] }

GET /api/v1/retention/streak
Response : { streak: RevisionStreak }

POST /api/v1/retention/streak/freeze
Description : Use a freeze token to protect streak
Response : { tokens_remaining: integer, streak_protected: boolean }

GET /api/v1/retention/schedule
Description : Get revision schedule for next N days
Query params: days=7
Response : { schedule: { date: date, due_count: integer, concepts: uuid[] }[] }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROUTER 4 — STUDY PLANNER /api/v1/planner
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POST /api/v1/planner/generate
Description : Generate a fresh study plan (LangChain agent, ~5s)
Body : {
exam_type: ExamType,
exam_date: date,
daily_hours: integer,
excluded_dates?: date[],
priority_subjects?: SubjectType[],
weak_subjects?: SubjectType[]
}
Response : { plan: StudyPlan, today: DailyStudyPlan }

GET /api/v1/planner/today
Description : Get today's study plan
Response : { plan: DailyStudyPlan, completion_percent: float }

GET /api/v1/planner/week
Description : Get this week's plan overview
Query params: week_offset=0 (0=current, 1=next, -1=previous)
Response : { days: DailyStudyPlan[], week_stats: WeekStats }

PATCH /api/v1/planner/today/slot/:slot_index
Description : Mark a slot as complete or skip
Body : { status: 'completed'|'skipped', actual_minutes?: integer }
Response : { plan: DailyStudyPlan, xp_earned: integer }

POST /api/v1/planner/rebalance
Description : Trigger manual plan rebalance (also runs nightly automatically)
Body : { reason?: string }
Response : { plan: StudyPlan, changes: PlanChange[], new_today: DailyStudyPlan }

PATCH /api/v1/planner/config
Description : Update plan settings
Body : { daily_hours?: integer, excluded_dates?: date[],
priority_subjects?: SubjectType[] }
Response : { plan: StudyPlan }

GET /api/v1/planner/history
Query params: limit=30&offset=0
Response : { plans: DailyStudyPlan[], completion_rate: float }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROUTER 5 — MCQ / PYQ TESTS /api/v1/mcq
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POST /api/v1/mcq/start
Description : Start a new test session
Body : {
exam_type: ExamType,
subject_id?: uuid,
chapter_id?: uuid,
question_count: integer, -- 10|20|30
duration_minutes: integer, -- 15|30|60
mode: 'pyq'|'practice'|'adaptive'|'chapter_test',
pyq_year_range?: [integer, integer],
difficulty?: DifficultyLevel
}
Response : {
test_session_id: uuid,
questions: Question[], -- without correct_option
started_at: timestamptz,
expires_at: timestamptz
}

POST /api/v1/mcq/answer
Description : Submit answer for one question during a live test
Body : {
test_session_id: uuid,
question_id: uuid,
selected_option: 'A'|'B'|'C'|'D'|'skipped',
time_spent_ms: integer
}
Response : { saved: true }
Note : Correct option NOT revealed until test submit

POST /api/v1/mcq/submit
Description : Submit the full test and get results
Body : { test_session_id: uuid }
Response : {
score: float,
max_score: float,
accuracy: float,
percentile: float,
time_taken_minutes: float,
results: QuestionResult[], -- with correct answers + explanations
concept_performance: ConceptScore[],
xp_earned: integer,
knowledge_graph_updates: ConceptStateChange[]
}
Side effects: Updates learner_concept_states for all tested concepts,
updates daily_activity_heatmap, inserts xp_ledger entries

GET /api/v1/mcq/sessions
Description : Test history
Query params: limit=20&offset=0&exam_type=JEE&subject_id=uuid
Response : { sessions: TestSessionSummary[], total: integer }

GET /api/v1/mcq/session/:session_id
Description : Full test session results
Response : { session: TestSession, answers: TestAnswer[], questions: Question[] }

GET /api/v1/mcq/questions
Description : Browse question bank (for practice, not test)
Query params: subject_id=uuid&chapter_id=uuid&exam_type=JEE&is_pyq=true
&difficulty=Medium&limit=20&offset=0
Response : { questions: Question[], total: integer }

GET /api/v1/mcq/analytics
Description : Aggregated test performance analytics
Response : {
overall_accuracy: float,
subject_accuracy: { subject: float }[],
time_trends: WeeklyScore[],
weak_chapters: ChapterScore[],
strong_chapters: ChapterScore[]
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROUTER 6 — CONTENT PROCESSOR /api/v1/content
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POST /api/v1/content/process
Description : Enqueue YouTube video for processing (async Celery task)
Rate limit : 5/day (free), 20/day (pro)
Body : {
youtube_url: string,
output_language?: 'en'|'hi',
generate_dub?: boolean,
subject_id?: uuid,
chapter_id?: uuid
}
Response : { job_id: uuid, status: 'pending', estimated_minutes: integer }

GET /api/v1/content/status/:job_id
Description : Poll processing status
Response : {
job_id: uuid,
status: ContentStatus,
progress_percent: integer,
stage: 'downloading'|'transcribing'|'generating_notes'|'dubbing'|'done',
result?: ProcessedVideo, -- populated when status=completed
error?: string
}

GET /api/v1/content/videos
Description : Get user's processed video library
Query params: limit=20&offset=0&subject_id=uuid&status=completed
Response : { videos: ProcessedVideo[], total: integer }

GET /api/v1/content/video/:video_id
Description : Get processed video with full notes
Response : { video: ProcessedVideo }

DELETE /api/v1/content/video/:video_id
Response : { deleted: true }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROUTER 7 — PROGRESS & ANALYTICS /api/v1/progress
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET /api/v1/progress/dashboard
Description : Main dashboard aggregated view
Response : {
streak: RevisionStreak,
today_plan: DailyStudyPlan,
due_cards_count: integer,
knowledge_summary: { mastered, learning, unseen, forgotten },
weekly_xp: integer,
recent_test_score: float|null,
upcoming_revisions: RevisionCard[],
syllabus_coverage: { subject: string, percent: float }[]
}

GET /api/v1/progress/heatmap
Description : Activity heatmap data (GitHub-style)
Query params: months=6
Response : { days: DailyActivity[] }

GET /api/v1/progress/weekly
Description : Weekly performance snapshot
Query params: weeks=8
Response : { weeks: WeeklySnapshot[] }

GET /api/v1/progress/subject/:subject_id
Description : Deep-dive into one subject's progress
Response : {
subject: Subject,
chapters: ChapterProgress[],
mastery_distribution: MasteryDistribution,
test_performance: SubjectTestStats,
concept_map: LearnerConceptState[]
}

GET /api/v1/progress/leaderboard
Description : Percentile rank vs other same-exam students
Query params: exam_type=JEE&period=weekly|monthly
Response : { rank: integer, percentile: float, total_students: integer,
top_10: LeaderboardEntry[] }

GET /api/v1/progress/xp
Description : XP ledger and level
Response : { total_xp: integer, level: integer, next_level_xp: integer,
ledger: XPEntry[], badges: UserBadge[] }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROUTER 8 — SYLLABUS /api/v1/syllabus
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET /api/v1/syllabus/subjects?exam_type=JEE
Response : { subjects: Subject[] }

GET /api/v1/syllabus/chapters?subject_id=uuid&exam_type=JEE
Response : { chapters: Chapter[] }

GET /api/v1/syllabus/concepts?chapter_id=uuid
Response : { concepts: Concept[] }

GET /api/v1/syllabus/concept/:concept_id
Response : { concept: Concept, prerequisites: Concept[], related: Concept[] }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROUTER 9 — NOTIFICATIONS /api/v1/notifications
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET /api/v1/notifications
Query params: unread_only=true&limit=20
Response : { notifications: Notification[], unread_count: integer }

PATCH /api/v1/notifications/:id/read
Response : { success: true }

PATCH /api/v1/notifications/read-all
Response : { updated: integer }

GET /api/v1/notifications/preferences
Response : { preferences: NotificationPreferences }

PATCH /api/v1/notifications/preferences
Body : Partial<NotificationPreferences>
Response : { preferences: NotificationPreferences }

POST /api/v1/notifications/fcm-token
Body : { token: string }
Response : { success: true }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROUTER 10 — MCP SERVER /mcp
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Transport : HTTP + SSE (Server-Sent Events) — MCP spec compliant
Auth : Authorization: Bearer <partner_api_key>
Protocol : JSON-RPC 2.0
Endpoint : POST /mcp (tool calls)
GET /mcp (SSE stream for server-initiated messages)

MCP TOOLS (5 tools, one per feature):

tool: solve_doubt
Description : Answers a student's doubt using NCERT-grounded RAG
Input schema: {
question: string, -- required
student_id: string, -- partner's external student ID
subject?: string, -- "Physics"|"Chemistry"|etc.
language?: "en"|"hi"|"hinglish",
session_context?: string -- prior conversation for follow-ups
}
Output : {
answer: string,
sources: [{title, chapter, page, excerpt}],
related_concepts: [{id, name, mastery_score}],
language: string,
tokens_used: integer
}

tool: get_revision_deck
Description : Returns today's due revision cards for a student
Input schema: {
student_id: string,
exam_type: "JEE"|"NEET"|"UPSC",
limit?: integer, -- default 20
subject_filter?: string
}
Output : {
cards: [{concept_id, concept_name, subject, chapter, mastery_score,
days_overdue, difficulty}],
total_due: integer,
estimated_minutes: integer
}

tool: submit_revision_result
Description : Records the outcome of a revision card (updates FSRS)
Input schema: {
student_id: string,
concept_id: string,
quality_score: integer, -- 0–5
response_time_ms: integer
}
Output : {
next_review_date: string,
new_interval_days: integer,
mastery_state: string
}

tool: get_study_plan
Description : Returns the student's study plan for a given date
Input schema: {
student_id: string,
exam_type: "JEE"|"NEET"|"UPSC",
exam_date: string, -- ISO date, used for first-time plan gen
plan_date?: string -- defaults to today
}
Output : {
plan_date: string,
slots: [{subject, chapter, topics, duration_minutes, type, completed}],
total_hours: float,
completion_percent: float
}

tool: run_mcq_test
Description : Fetches a set of MCQ/PYQ questions for a test
Input schema: {
student_id: string,
exam_type: "JEE"|"NEET"|"UPSC",
subject?: string,
chapter_id?: string,
count?: integer, -- default 10
mode?: "pyq"|"practice"|"adaptive"
}
Output : {
session_id: string,
questions: [{id, question_text, option_a, option_b, option_c, option_d,
difficulty, subject, chapter}],
expires_at: string
}

tool: submit_mcq_answers
Description : Grades an MCQ session and updates knowledge graph
Input schema: {
student_id: string,
session_id: string,
answers: [{question_id: string, selected_option: "A"|"B"|"C"|"D"|"skipped",
time_spent_ms: integer}]
}
Output : {
score: float,
accuracy: float,
results: [{question_id, correct_option, is_correct, explanation}],
concept_updates: [{concept_id, new_mastery_state}]
}

tool: process_video
Description : Enqueues a YouTube video for note extraction
Input schema: {
student_id: string,
youtube_url: string,
output_language?: "en"|"hi"
}
Output : { job_id: string, status: "pending", estimated_minutes: integer }

tool: get_video_status
Description : Polls the status of a video processing job
Input schema: { job_id: string }
Output : {
status: "pending"|"processing"|"completed"|"failed",
progress_percent: integer,
notes?: [{heading, content, concepts_tagged}],
summary?: string,
error?: string
}

MCP RESOURCES (read-only data the partner LLM can access):

resource: vidyai://syllabus/{exam_type}
Returns full subject → chapter → concept tree for JEE, NEET, or UPSC

resource: vidyai://student/{student_id}/profile
Returns student's mastery summary, streak, and exam date

resource: vidyai://student/{student_id}/knowledge-graph
Returns learner_concept_states for the student (all concepts + scores)

MCP PROMPTS (reusable system prompt templates for partner LLMs):

prompt: explain_concept
Args: { concept_name, subject, exam_type, language }
Returns a system prompt template for explaining a concept in exam context

prompt: motivate_student
Args: { student_name, streak_days, exam_date, weak_subjects }
Returns a motivational prompt grounded in the student's actual stats

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROUTER 11 — PARTNER ADMIN /api/v1/partner
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All routes require: Authorization: Bearer <partner_admin_jwt>

POST /api/v1/partner/keys
Body : { name: string, scopes: string[], expires_at?: date }
Response : { api_key: string, key_prefix: string, id: uuid }
Note : api_key returned ONCE only, never stored in plaintext

GET /api/v1/partner/keys
Response : { keys: ApiKeyMeta[] } -- no plaintext keys, prefix only

DELETE /api/v1/partner/keys/:key_id
Response : { revoked: true }

GET /api/v1/partner/usage
Query params: from=date&to=date&tool=solve_doubt
Response : { total_calls: integer, by_tool: {tool: count}[],
by_day: DailyUsage[], tokens_used: integer }

GET /api/v1/partner/students
Response : { students: PartnerStudentMapping[], total: integer }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 6 — KEY SERVICE CONTRACTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FSRS ALGORITHM (retention_service.py)
Parameters per concept per student: S (stability), D (difficulty), R (retrievability)
Forgetting curve : R(t) = exp(-t / S)
Review outcome : pass (q >= 3) updates S and D via FSRS-4.5 equations
fail (q < 3) resets stability to initial value
Scheduling rule : next_review = today + round(S \* ln(target_R) / ln(R_0))
where target_R = 0.9 (90% desired retention)
nightly Celery job: runs at 00:30 IST, computes next_review_date for all active
learner_concept_states, upserts revision_queue

LANGCHAIN RAG CHAIN (tutor_service.py)
Retriever : SupabaseVectorStore with pgvector, k=5, cosine similarity
System prompt template includes: {context_chunks} + {student_name} + {language}
Hallucination guard: output parser checks sources[] is non-empty;
if empty → refuse with "source not found" message
Streaming : use LangChain streaming callbacks → Server-Sent Events to frontend
Citation format: every sentence that uses a source must reference [{source_index}]

LANGCHAIN STUDY PLANNER AGENT (planner_service.py)
Agent type : ReAct agent with structured tool outputs
Tools available to agent: - get_weak_concepts(user_id) → ConceptGap[] - get_syllabus_coverage(user_id) → CoverageMap - get_upcoming_revisions(user_id, days=14) → RevisionLoad - get_historical_performance(user_id) → SubjectScore[] - get_exam_weightage(exam_type) → WeightageMap
Agent output: JSON matching DailyStudyPlan.slots schema
Rebalance triggers (nightly Celery job at 01:00 IST): - Today's plan was < 50% completed - Exam date changed - 3+ consecutive weak test scores in a subject - Forgotten cards > 20% of knowledge graph

CELERY BEAT SCHEDULE (celery_app.py)
nightly-scheduler : 00:30 IST daily → scheduler_worker.run_revision_scheduler()
nightly-rebalancer : 01:00 IST daily → planner_worker.rebalance_all_active_plans()
heatmap-rollup : 23:55 IST daily → analytics_worker.rollup_daily_heatmap()
weekly-snapshot : Sunday 02:00 IST → analytics_worker.generate_weekly_snapshots()
partner-usage-reset: 1st of month 00:00 → usage_meter.reset_monthly_counts()

VIDEO PROCESSING PIPELINE (video_worker.py, Celery task)
Step 1: yt-dlp → download audio track (mp3, max 2hr)
Step 2: Whisper API → transcript with timestamps
Step 3: GPT-4o → structured notes JSON
prompt: "Given this educational video transcript, extract: 1. Structured notes with headings and bullet points 2. Key concepts as a list (match to syllabus if possible) 3. A 200-word summary
Output valid JSON only."
Step 4: Tag concepts → match summary nouns against concepts.name using pg_trgm
Step 5: If generate_dub=true → Sarvam AI TTS on translated summary → S3 upload
Step 6: Update processed_videos.processing_status = 'completed'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 7 — ENVIRONMENT VARIABLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Supabase

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI providers

ANTHROPIC_API_KEY=
OPENAI_API_KEY=
SARVAM_API_KEY=

# Storage

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=vidyai-content
AWS_REGION=ap-south-1

# Queue

REDIS_URL=

# Billing

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# App

NEXT_PUBLIC_API_URL=https://api.vidyai.in
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ENVIRONMENT=production

# Observability

SENTRY_DSN=
DATADOG_API_KEY=

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 8 — CODING CONVENTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PYTHON (FastAPI):

- All route handlers are async def
- All DB operations use Supabase Python client (supabase-py), not raw psycopg2
- Pydantic v2 for all request/response models
- Raise HTTPException with detail as dict: { "error": "...", "code": "..." }
- All service functions accept user_id: uuid.UUID as first parameter
- Log every LLM call: model, tokens_used, latency_ms, endpoint, user_id
- Never log question content or student PII at DEBUG level

TYPESCRIPT (Next.js):

- Use server components by default; add "use client" only when needed
- All API calls go through lib/api/ typed client, never raw fetch in components
- Error boundaries around every feature section
- Loading states on all async data fetches
- All dates displayed in IST using Intl.DateTimeFormat

GENERAL:

- Every feature must degrade gracefully if the LLM is unavailable
- All PYQ question text must be returned exactly as in the source
- FSRS parameters must be updated atomically per review
- Partner API key must NEVER appear in logs, even partially
- Rate limits enforced at FastAPI middleware level, not in route handlers

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
END OF CONTEXT — BEGIN TASK BELOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You now have complete context for the VidyAI platform.
State which component you are implementing before writing any code.
Follow all conventions above without deviation.

[DESCRIBE YOUR TASK HERE — e.g. "Implement the FastAPI tutor router with
the LangChain RAG chain" or "Generate the Supabase migration SQL for all
14 modules" or "Build the Next.js revision deck page component"]
