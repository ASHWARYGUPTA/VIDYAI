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
