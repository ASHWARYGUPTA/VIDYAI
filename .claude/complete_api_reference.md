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
