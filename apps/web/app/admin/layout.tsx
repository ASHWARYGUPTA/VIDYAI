import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user;

  if (!user || !user.email) redirect("/login");

  const supabase = createServiceClient();
  const { data: adminRecord } = await supabase
    .from("admins")
    .select("email")
    .eq("email", user.email)
    .maybeSingle();

  if (!adminRecord) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold">VidyAI</span>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Admin</span>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <a href="/admin/knowledge" className="text-muted-foreground hover:text-foreground transition-colors">
            Knowledge Base
          </a>
          <a href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
            ← Back to App
          </a>
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
