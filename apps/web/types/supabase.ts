// Auto-generated types placeholder — run `supabase gen types typescript` to regenerate
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string;
          phone: string | null;
          avatar_url: string | null;
          preferred_language: string;
          exam_target: "JEE" | "NEET" | "UPSC";
          exam_date: string | null;
          current_class: string | null;
          daily_study_hours: number;
          subscription_tier: "free" | "pro" | "enterprise";
          streak_count: number;
          last_active_date: string | null;
          timezone: string;
          onboarding_completed: boolean;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      exam_type: "JEE" | "NEET" | "UPSC";
      mastery_state: "unseen" | "learning" | "reviewing" | "mastered" | "forgotten";
      subscription_tier: "free" | "pro" | "enterprise";
    };
  };
};
