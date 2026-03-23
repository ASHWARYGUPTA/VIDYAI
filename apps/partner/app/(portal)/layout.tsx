"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Key, BarChart2, Users, BookOpen, Settings, LogOut, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { partnerApi } from "@/lib/api/partner-client";
import { Separator } from "@/components/ui/separator";

const NAV = [
  { href: "/dashboard", label: "Dashboard",  icon: LayoutDashboard },
  { href: "/keys",      label: "API Keys",    icon: Key },
  { href: "/usage",     label: "Usage",       icon: BarChart2 },
  { href: "/students",  label: "Students",    icon: Users },
  { href: "/docs",      label: "Docs & SDK",  icon: BookOpen },
  { href: "/settings",  label: "Settings",    icon: Settings },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [ready, setReady]         = useState(false);
  const [validated, setValidated] = useState(false);

  useEffect(() => {
    if (validated) { setReady(true); return; }

    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.replace("/login");
        return;
      }
      try {
        await partnerApi.validate();
        setValidated(true);
        setReady(true);
      } catch {
        router.replace("/onboarding");
      }
    });
  }, [pathname, router, validated]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!ready) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="flex h-full w-60 flex-col border-r bg-card">
        <div className="flex items-center gap-2 px-6 py-5">
          <Zap className="h-5 w-5 text-primary" />
          <span className="text-lg font-bold tracking-tight">VidyAI</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            Partners
          </span>
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link key={href} href={href} className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}>
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 pb-4">
          <Separator className="mb-3" />
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-slate-50/70">{children}</main>
    </div>
  );
}
