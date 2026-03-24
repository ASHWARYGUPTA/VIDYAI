"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen, Brain, Calendar, BarChart2, FileText, Home, LogOut, Video, Network, GraduationCap, Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut as nextAuthSignOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/tutor", label: "AI Tutor", icon: Brain },
  { href: "/dashboard/revision", label: "Revision", icon: BookOpen },
  { href: "/dashboard/planner", label: "Planner", icon: Calendar },
  { href: "/dashboard/curriculum", label: "Curriculum", icon: GraduationCap },
  { href: "/dashboard/graph", label: "Knowledge Graph", icon: Network },
  { href: "/dashboard/tests", label: "Tests", icon: FileText },
  { href: "/dashboard/progress", label: "Progress", icon: BarChart2 },
  { href: "/dashboard/content", label: "Content", icon: Video },
];

interface SidebarProps {
  user: { id?: string; email?: string; user_metadata?: { full_name?: string; avatar_url?: string } };
}

function SidebarContent({ user, onNavigate }: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();

  async function signOut() {
    await nextAuthSignOut({ callbackUrl: "/login" });
  }

  const name = user.user_metadata?.full_name ?? user.email ?? "Student";
  const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <>
      {/* Logo */}
      <div className="p-6 pb-4">
        <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onNavigate}>
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md shadow-blue-500/20">
            <svg className="h-4.5 w-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
            VidyAI
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/25"
                  : "text-gray-500 hover:bg-blue-50 hover:text-blue-700"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <Separator className="bg-blue-100/60" />
      <div className="p-4">
        <div className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-blue-50/50 transition-colors">
          <Avatar className="h-9 w-9 border-2 border-blue-100">
            <AvatarImage src={user.user_metadata?.avatar_url} />
            <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate text-gray-800">{name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="h-8 w-8 shrink-0 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

/* ── Mobile top bar ── */
export function MobileHeader({ user }: SidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="md:hidden flex items-center justify-between border-b border-blue-100/60 bg-white px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-sm">
            <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
            VidyAI
          </span>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} className="h-9 w-9">
          <Menu className="h-5 w-5 text-gray-600" />
        </Button>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0 flex flex-col">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent user={user} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

/* ── Desktop sidebar (unchanged) ── */
export function Sidebar({ user }: SidebarProps) {
  return (
    <aside className="hidden md:flex h-screen w-64 flex-col border-r border-blue-100/60 bg-white">
      <SidebarContent user={user} />
    </aside>
  );
}
