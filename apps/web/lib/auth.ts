import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";

// Supabase client used server-side only (in JWT callback) to exchange Google
// ID token for a Supabase session. Uses the anon key — signInWithIdToken
// is a user-facing auth operation, not an admin one.
function getSupabaseAuthClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    // ── Email / Password ──────────────────────────────────────────────────
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const supabase = getSupabaseAuthClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email as string,
          password: credentials.password as string,
        });
        if (error || !data.session) return null;
        // Return enough for the jwt callback to pick up the Supabase tokens
        return {
          id: data.session.user.id,
          email: data.session.user.email,
          name: data.session.user.user_metadata?.full_name ?? null,
          image: data.session.user.user_metadata?.avatar_url ?? null,
          // Custom fields carried through to jwt callback
          supabaseAccessToken: data.session.access_token,
          supabaseRefreshToken: data.session.refresh_token,
          supabaseExpiresAt: data.session.expires_at ?? 0,
        };
      },
    }),

    // ── Google OAuth ──────────────────────────────────────────────────────
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],

  callbacks: {
    async jwt({ token, account, user }) {
      // ── Credentials sign-in ──────────────────────────────────────────────
      // account.provider === "credentials" on the first call after authorize().
      if (account?.provider === "credentials") {
        const u = user as typeof user & {
          supabaseAccessToken?: string;
          supabaseRefreshToken?: string;
          supabaseExpiresAt?: number;
        };
        token.supabaseAccessToken = u.supabaseAccessToken;
        token.supabaseRefreshToken = u.supabaseRefreshToken;
        token.supabaseUserId = u.id;
        token.supabaseExpiresAt = u.supabaseExpiresAt ?? 0;
        return token;
      }

      // ── Initial Google sign-in ───────────────────────────────────────────
      // account is only present on the very first callback after OAuth redirect.
      if (account?.provider === "google" && account.id_token) {
        const supabase = getSupabaseAuthClient();
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: account.id_token,
        });

        if (error) {
          // Surface error so the sign-in flow fails cleanly
          throw new Error(`Supabase sign-in failed: ${error.message}`);
        }

        token.supabaseAccessToken = data.session!.access_token;
        token.supabaseRefreshToken = data.session!.refresh_token;
        token.supabaseUserId = data.session!.user.id;
        token.supabaseExpiresAt = data.session!.expires_at ?? 0;
        return token;
      }

      // ── Token still valid ────────────────────────────────────────────────
      const expiresAt = (token.supabaseExpiresAt as number) ?? 0;
      if (Date.now() / 1000 < expiresAt - 60) {
        return token;
      }

      // ── Refresh expired Supabase token ───────────────────────────────────
      if (token.supabaseRefreshToken) {
        const supabase = getSupabaseAuthClient();
        const { data, error } = await supabase.auth.refreshSession({
          refresh_token: token.supabaseRefreshToken as string,
        });
        if (!error && data.session) {
          token.supabaseAccessToken = data.session.access_token;
          token.supabaseRefreshToken = data.session.refresh_token;
          token.supabaseExpiresAt = data.session.expires_at ?? 0;
        } else {
          // Refresh failed — clear token so user is prompted to sign in again
          token.supabaseAccessToken = undefined;
          token.error = "RefreshTokenError";
        }
      }

      return token;
    },

    async session({ session, token }) {
      session.supabaseAccessToken = (token.supabaseAccessToken as string) ?? null;
      session.user.id = (token.supabaseUserId as string) ?? "";
      if (token.error) session.error = token.error as string;
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
});
