import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Not logged in
  if (!session?.user) redirect("/login");

  // Supabase refresh token expired — force re-login
  if (session.error === "RefreshTokenError") redirect("/login");

  // Use service-role client for the profile lookup (no Supabase session cookie needed)
  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", session.user.id)
    .single() as { data: { onboarding_completed?: boolean } | null };

  if (!profile?.onboarding_completed) redirect("/onboarding");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={{ id: session.user.id, email: session.user.email ?? "" }} />
      <main className="flex-1 overflow-y-auto bg-slate-50/70">
        {children}
      </main>
    </div>
  );
}
