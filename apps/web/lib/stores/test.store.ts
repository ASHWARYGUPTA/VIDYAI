import { create } from "zustand";

interface AnswerRecord {
  selected: number;
  correct: number;
  isCorrect: boolean;
  explanation: string;
}

interface TestSession {
  session_id: string;
  questions: { id: string; question_text: string; options: string[] }[];
}

interface TestState {
  session: TestSession | null;
  currentIndex: number;
  answers: Record<string, AnswerRecord>;
  setSession: (session: TestSession) => void;
  recordAnswer: (questionId: string, selected: number, isCorrect: boolean, correct: number, explanation: string) => void;
  nextQuestion: () => void;
  reset: () => void;
}

export const useTestStore = create<TestState>((set, get) => ({
  session: null,
  currentIndex: 0,
  answers: {},
  setSession: (session) => set({ session, currentIndex: 0, answers: {} }),
  recordAnswer: (questionId, selected, isCorrect, correct, explanation) =>
    set((s) => ({
      answers: { ...s.answers, [questionId]: { selected, isCorrect, correct, explanation } },
    })),
  nextQuestion: () =>
    set((s) => ({ currentIndex: Math.min(s.currentIndex + 1, (s.session?.questions.length ?? 1) - 1) })),
  reset: () => set({ session: null, currentIndex: 0, answers: {} }),
}));
