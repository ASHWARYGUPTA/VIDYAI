export type ExamType = "JEE" | "NEET" | "UPSC";
export type MasteryState = "unseen" | "learning" | "reviewing" | "mastered" | "forgotten";
export type Language = "en" | "hi" | "hinglish";
export type SubscriptionTier = "free" | "pro" | "enterprise";
export type ContentStatus = "pending" | "processing" | "completed" | "failed";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  preferred_language: Language;
  exam_target: ExamType;
  exam_date: string | null;
  current_class: string | null;
  daily_study_hours: number;
  subscription_tier: SubscriptionTier;
  streak_count: number;
  onboarding_completed: boolean;
}

export interface RevisionStreak {
  current_streak: number;
  longest_streak: number;
  last_revision_date: string | null;
  freeze_tokens_remaining: number;
}

export interface DailyStudyPlan {
  id: string;
  plan_date: string;
  total_hours: number;
  is_completed: boolean;
  completion_percent: number;
  slots: PlanSlot[];
}

export interface PlanSlot {
  subject: string;
  chapter_id: string | null;
  concept_ids: string[];
  duration_minutes: number;
  type: "new" | "revision" | "test";
  status?: "completed" | "skipped";
  actual_minutes?: number;
}

export interface RevisionCard {
  concept_id: string;
  priority_score: number;
  scheduled_date?: string;
  concepts?: {
    name: string;
    subject_id: string;
    chapter_id: string;
    difficulty_level: string;
  };
}

export interface LearnerConceptState {
  concept_id: string;
  mastery_state: MasteryState;
  mastery_score: number;
  next_review_date: string | null;
  interval_days: number;
  concepts?: { name: string; subject_id: string };
}

export interface DoubtSession {
  id: string;
  question_text: string;
  answer_text: string | null;
  answer_audio_url: string | null;
  sources: Source[];
  was_helpful: boolean | null;
  created_at: string;
}

export interface Source {
  title: string;
  chapter: string;
  page: number | null;
  excerpt: string;
}

export interface Question {
  id: string;
  question_text: string;
  question_text_hindi: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  difficulty_level: string;
  exam_type: ExamType;
  is_pyq: boolean;
  exam_year: number | null;
}

export interface ProcessedVideo {
  id: string;
  youtube_url: string;
  youtube_video_id: string;
  title: string | null;
  channel: string | null;
  duration_seconds: number | null;
  structured_notes: VideoNote[];
  summary: string | null;
  processing_status: ContentStatus;
  thumbnail_url: string | null;
  created_at: string;
}

export interface VideoNote {
  heading: string;
  content: string;
  timestamp_seconds: number | null;
}

export interface DashboardData {
  streak: RevisionStreak | null;
  today_plan: DailyStudyPlan | null;
  due_cards_count: number;
  knowledge_summary: Record<MasteryState, number>;
  weekly_xp: number;
  recent_test_score: number | null;
  upcoming_revisions: RevisionCard[];
  syllabus_coverage: { subject: string; percent: number }[];
}
