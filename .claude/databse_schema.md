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
