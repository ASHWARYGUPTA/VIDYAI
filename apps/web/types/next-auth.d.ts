import type { DefaultSession } from "next-auth";
import type { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session extends DefaultSession {
    /** Supabase access token — passed as Bearer token to FastAPI */
    supabaseAccessToken: string | null;
    /** Set when the Supabase refresh token has expired and re-auth is needed */
    error?: string;
    user: {
      /** Supabase user UUID */
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    supabaseAccessToken?: string;
    supabaseRefreshToken?: string;
    supabaseUserId?: string;
    supabaseExpiresAt?: number;
    error?: string;
  }
}
