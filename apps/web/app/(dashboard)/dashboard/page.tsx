"use client";
import { useQuery } from "@tanstack/react-query";
import { Flame, BookOpen, Calendar, Zap, ArrowRight } from "lucide-react";
import Link from "next/link";
import { progressApi, retentionApi } from "@/lib/api/endpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  gradient = "from-blue-500 to-blue-600",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  gradient?: string;
}) {
  return (
    <Card className="border-blue-100/50 card-hover bg-white">
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className={`rounded-xl bg-gradient-to-br ${gradient} p-2.5 shadow-lg shadow-blue-500/15`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {sub && <p className="text-xs text-gray-400">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface DashResponse {
  streak?: { current_streak?: number };
  due_cards_count?: number;
  weekly_xp?: number;
  knowledge_summary?: Record<string, number>;
  today_plan?: { slots?: unknown[]; completion_percent?: number };
}

interface PlanSlot {
  id?: string;
  subject?: { name: string };
  topic?: string;
  duration_minutes: number;
  is_completed?: boolean;
  status?: string;
}

export default function DashboardPage() {
  const { data: dash, isLoading: dashLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => progressApi.dashboard(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: deck, isLoading: deckLoading } = useQuery({
    queryKey: ["deck-today"],
    queryFn: () => retentionApi.today(),
    staleTime: 5 * 60 * 1000,
  });

  if (dashLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const d = dash as DashResponse | undefined;
  const streak = d?.streak?.current_streak ?? 0;
  const dueCards = d?.due_cards_count ?? 0;
  const weeklyXp = d?.weekly_xp ?? 0;

  const planRaw = d?.today_plan as { slots?: PlanSlot[]; completion_percent?: number } | null | undefined;
  const slots = planRaw?.slots ?? [];
  const completedSlots = slots.filter((s) => s.is_completed || s.status === "completed").length;
  const totalSlots = slots.length;
  const planPct = planRaw?.completion_percent ?? (totalSlots ? Math.round((completedSlots / totalSlots) * 100) : 0);

  const cards = deck?.cards ?? [];

  return (
    <div className="p-8 space-y-8">
      {/* Greeting */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Good {getGreeting()} 👋</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <Link href="/dashboard/revision">
          <Button size="sm" className="bg-gradient-to-r from-blue-600 to-blue-500 shadow-md shadow-blue-500/20">
            Start Revision <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Flame} label="Day streak" value={streak} sub="Keep it up!" gradient="from-orange-400 to-orange-500" />
        <StatCard icon={BookOpen} label="Due cards" value={dueCards} sub={`${deck?.new_cards ?? 0} new today`} gradient="from-blue-500 to-blue-600" />
        <StatCard icon={Calendar} label="Today's plan" value={`${completedSlots}/${totalSlots}`} sub={`${planPct}% done`} gradient="from-emerald-500 to-emerald-600" />
        <StatCard icon={Zap} label="Weekly XP" value={weeklyXp} sub="This week" gradient="from-amber-400 to-amber-500" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's plan */}
        <Card className="border-blue-100/50 bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-gray-900">Today&apos;s Study Plan</CardTitle>
              <Link href="/dashboard/planner" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)
            ) : slots.length ? (
              <>
                <Progress value={planPct} className="mb-4" />
                {slots.slice(0, 5).map((slot, i) => {
                  const done = slot.is_completed || slot.status === "completed";
                  return (
                    <div key={slot.id ?? i} className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${done ? "bg-green-50/50 border-green-200" : "border-gray-200 hover:border-blue-200 hover:bg-blue-50/30"}`}>
                      <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${done ? "bg-green-500" : "bg-gray-300"}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${done ? "text-gray-400 line-through" : "text-gray-800"}`}>{slot.subject?.name ?? "Study"}</p>
                        <p className="text-xs text-gray-400 truncate">{slot.topic}</p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0 border-blue-200 text-blue-600">{slot.duration_minutes}m</Badge>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">No plan for today.</p>
                <Link href="/dashboard/planner">
                  <Button variant="outline" size="sm" className="mt-3 border-blue-200 text-blue-600 hover:bg-blue-50">
                    Generate plan
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Due cards */}
        <Card className="border-blue-100/50 bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-gray-900">Revision Queue</CardTitle>
              <Link href="/dashboard/revision" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                Start →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {deckLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)
            ) : cards.length ? (
              cards.slice(0, 5).map((card, i) => {
                const c = card as { concept_id: string; concepts?: { name?: string }; mastery_state?: string };
                return (
                  <div key={c.concept_id ?? i} className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-gray-800">{c.concepts?.name ?? "Concept"}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs shrink-0 ${c.mastery_state === "unseen" ? "border-blue-300 text-blue-600 bg-blue-50" : "border-amber-300 text-amber-600 bg-amber-50"}`}
                    >
                      {c.mastery_state ?? "due"}
                    </Badge>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <BookOpen className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">All caught up! No cards due today.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
