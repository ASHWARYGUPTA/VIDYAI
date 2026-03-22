import { create } from "zustand";
import type { RevisionCard } from "@/lib/api/types";

interface RevisionState {
  cards: RevisionCard[];
  currentIndex: number;
  sessionId: string | null;
  startTime: number;
  setCards: (cards: RevisionCard[], sessionId: string) => void;
  nextCard: () => void;
  reset: () => void;
}

export const useRevisionStore = create<RevisionState>((set) => ({
  cards: [],
  currentIndex: 0,
  sessionId: null,
  startTime: Date.now(),
  setCards: (cards, sessionId) => set({ cards, sessionId, currentIndex: 0, startTime: Date.now() }),
  nextCard: () => set((s) => ({ currentIndex: s.currentIndex + 1, startTime: Date.now() })),
  reset: () => set({ cards: [], currentIndex: 0, sessionId: null }),
}));
