import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const hasTokenError = req.auth?.error === "RefreshTokenError";

  // Paths that never require auth
  const isPublic =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/api/auth") ||   // NextAuth callback routes
    pathname.startsWith("/auth/");        // Supabase OAuth callback (kept for compatibility)

  // If token expired, force re-login
  if (hasTokenError) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "session_expired");
    return NextResponse.redirect(url);
  }

  // Redirect unauthenticated users to login
  if (!isLoggedIn && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from login/signup
  if (isLoggedIn && (pathname === "/login" || pathname === "/signup")) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|.*\\.png$|.*\\.svg$).*)",
  ],
};
