import { api } from "./client";

// Auth
export const authApi = {
  onboard: (body: unknown) => api.post("/api/v1/auth/onboard", body),
  profile: () => api.get("/api/v1/auth/profile"),
  updateProfile: (body: unknown) => api.patch("/api/v1/auth/profile", body),
  subscription: () => api.get("/api/v1/auth/subscription"),
};

// Progress
export const progressApi = {
  dashboard: () =>
    api.get<{
      streak: { current_streak: number; longest_streak: number; freeze_tokens_remaining: number } | null;
      today_plan: { slots: unknown[]; completion_percent: number } | null;
      due_cards_count: number;
      knowledge_summary: Record<string, number>;
      weekly_xp: number;
      recent_test_score: number | null;
    }>("/api/v1/progress/dashboard"),
  heatmap: (params?: { months?: number }) =>
    api.get<{ days: unknown[] }>(
      `/api/v1/progress/heatmap${params?.months ? `?months=${params.months}` : ""}`,
    ),
  weekly: () => api.get<{ weeks: unknown[] }>("/api/v1/progress/weekly"),
  xp: () =>
    api.get<{
      total_xp: number;
      level: number;
      next_level_xp: number;
      ledger: unknown[];
      badges: { id: string; name: string; description: string }[];
    }>("/api/v1/progress/xp"),
  leaderboard: (examType: string, period = "weekly") =>
    api.get<{
      rank: number;
      percentile: number;
      total_students: number;
      top_10: unknown[];
      my_xp: number;
    }>(`/api/v1/progress/leaderboard?exam_type=${examType}&period=${period}`),
};

// Tutor
export const tutorApi = {
  ask: (body: { question: string; subject_id?: string }) =>
    api.post<{
      doubt_id: string;
      answer: string;
      sources: { content_chunk?: string; chapter?: string; concept?: string }[];
      tokens_used: number;
    }>("/api/v1/tutor/ask", body),
  history: (params?: { limit?: number; offset?: number }) =>
    api.get<{
      doubts: { id: string; question_text: string; created_at: string }[];
      total: number;
    }>(
      `/api/v1/tutor/history?limit=${params?.limit ?? 20}&offset=${params?.offset ?? 0}`,
    ),
  feedback: (doubtId: string, wasHelpful: boolean) =>
    api.post(`/api/v1/tutor/doubt/${doubtId}/feedback`, {
      was_helpful: wasHelpful,
    }),
};

// Retention
export const retentionApi = {
  today: (limit = 30) =>
    api.get<{
      cards: {
        id: string;
        concept_id: string;
        mastery_state: string;
        concept?: {
          name: string;
          description?: string;
          key_formulas?: string;
          chapter?: { name: string };
        };
      }[];
      total_due: number;
      new_cards: number;
      streak: number;
    }>(`/api/v1/retention/deck/today?limit=${limit}`),
  review: (
    conceptId: string,
    body: { quality_score: number; response_time_ms?: number },
  ) =>
    api.post<{
      next_review_date: string;
      new_mastery_state: string;
      xp_earned: number;
    }>(`/api/v1/retention/review`, {
      concept_id: conceptId,
      response_time_ms: 0,
      ...body,
    }),
  streak: () => api.get("/api/v1/retention/streak"),
  freeze: () => api.post("/api/v1/retention/streak/freeze", {}),
  knowledgeGraph: (subjectId?: string) =>
    api.get(
      `/api/v1/retention/knowledge-graph${subjectId ? `?subject_id=${subjectId}` : ""}`,
    ),
  weakAreas: (limit = 10) =>
    api.get(`/api/v1/retention/weak-areas?limit=${limit}`),
};

// Planner
export const plannerApi = {
  today: () =>
    api.get<{
      slots: unknown[];
      plan_date: string;
      completion_percent: number;
    }>("/api/v1/planner/today"),
  week: (weekOffset = 0) =>
    api.get<{ days: unknown[] }>(
      `/api/v1/planner/week?week_offset=${weekOffset}`,
    ),
  generate: (body: unknown) => api.post("/api/v1/planner/generate", body),
  completeSlot: (slotIndex: number) =>
    api.patch(`/api/v1/planner/today/slot/${slotIndex}`, {
      status: "completed",
    }),
  rebalance: (reason?: string) =>
    api.post("/api/v1/planner/rebalance", { reason }),
};

// MCQ
export const mcqApi = {
  start: (body: {
    exam_type: string;
    subject_id?: string;
    chapter_id?: string;
    question_count: number;
    duration_minutes?: number;
    mode: string;
    difficulty?: string;
  }) =>
    api.post<{
      test_session_id: string;
      questions: {
        id: string;
        question_text: string;
        option_a: string;
        option_b: string;
        option_c: string;
        option_d: string;
      }[];
      started_at: string;
      expires_at: string;
    }>("/api/v1/mcq/start", body),
  answer: (body: {
    test_session_id: string;
    question_id: string;
    selected_option: string;
    time_spent_ms: number;
  }) => api.post<{ saved: boolean }>("/api/v1/mcq/answer", body),
  submit: (body: { test_session_id: string }) =>
    api.post<{
      score: number;
      max_score: number;
      accuracy: number;
      xp_earned: number;
      results: unknown[];
    }>("/api/v1/mcq/submit", body),
  sessions: (params?: { limit?: number }) =>
    api.get<{
      sessions: {
        id: string;
        score: number;
        max_score: number;
        started_at: string;
      }[];
      total: number;
    }>(`/api/v1/mcq/sessions?limit=${params?.limit ?? 20}`),
};

// Content
export const contentApi = {
  process: (body: { youtube_url: string }) =>
    api.post<{ job_id: string; status: string }>(
      "/api/v1/content/process",
      body,
    ),
  status: (jobId: string) => api.get(`/api/v1/content/status/${jobId}`),
  list: (params?: { limit?: number }) =>
    api.get<{
      videos: {
        id: string;
        youtube_url: string;
        title?: string;
        processing_status: string;
        summary?: string;
        key_concepts?: string[];
        structured_notes?: string;
        created_at: string;
      }[];
    }>(`/api/v1/content/videos?limit=${params?.limit ?? 20}`),
  get: (id: string) => api.get(`/api/v1/content/video/${id}`),
  delete: (id: string) => api.delete(`/api/v1/content/video/${id}`),
};

// Syllabus
export const syllabusApi = {
  subjects: (examType?: string) =>
    api.get<{ subjects: unknown[] }>(
      `/api/v1/syllabus/subjects${examType ? `?exam_type=${examType}` : ""}`,
    ),
  chapters: (subjectId: string) =>
    api.get<{ chapters: unknown[] }>(
      `/api/v1/syllabus/chapters?subject_id=${subjectId}`,
    ),
};
