import { create } from "zustand";
import type { Profile } from "@/lib/api/types";

interface AuthState {
  profile: Profile | null;
  setProfile: (p: Profile | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
}));
