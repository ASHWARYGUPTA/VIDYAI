"use client";
import { useQuery } from "@tanstack/react-query";
import { Flame, BookOpen, Calendar, Zap } from "lucide-react";
import { progressApi, retentionApi } from "@/lib/api/endpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  colorClass = "text-primary",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  colorClass?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg bg-primary/10 p-2 ${colorClass}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
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
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  const d = dash as DashResponse | undefined;
  const streak = d?.streak?.current_streak ?? 0;
  const dueCards = d?.due_cards_count ?? 0;
  const weeklyXp = d?.weekly_xp ?? 0;

  // Planner: from dashboard today_plan
  const planRaw = d?.today_plan as { slots?: PlanSlot[]; completion_percent?: number } | null | undefined;
  const slots = planRaw?.slots ?? [];
  const completedSlots = slots.filter((s) => s.is_completed || s.status === "completed").length;
  const totalSlots = slots.length;
  const planPct = planRaw?.completion_percent ?? (totalSlots ? Math.round((completedSlots / totalSlots) * 100) : 0);

  // Deck
  const cards = deck?.cards ?? [];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Good {getGreeting()}</h1>
        <p className="text-muted-foreground text-sm">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Flame} label="Day streak" value={streak} sub="Keep it up!" colorClass="text-orange-500" />
        <StatCard icon={BookOpen} label="Due cards" value={dueCards} sub={`${deck?.new_cards ?? 0} new today`} />
        <StatCard icon={Calendar} label="Today's plan" value={`${completedSlots}/${totalSlots}`} sub={`${planPct}% done`} />
        <StatCard icon={Zap} label="Weekly XP" value={weeklyXp} sub="This week" colorClass="text-yellow-500" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's plan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s Study Plan</CardTitle>
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
                    <div key={slot.id ?? i} className="flex items-center gap-3 rounded-lg border p-3">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${done ? "bg-green-500" : "bg-muted-foreground"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{slot.subject?.name ?? "Study"}</p>
                        <p className="text-xs text-muted-foreground truncate">{slot.topic}</p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">{slot.duration_minutes}m</Badge>
                    </div>
                  );
                })}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No plan for today. Go to Planner to generate one.</p>
            )}
          </CardContent>
        </Card>

        {/* Due cards */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revision Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {deckLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)
            ) : cards.length ? (
              cards.slice(0, 5).map((card, i) => {
                const c = card as { concept_id: string; concepts?: { name?: string }; mastery_state?: string };
                return (
                  <div key={c.concept_id ?? i} className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.concepts?.name ?? "Concept"}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs shrink-0 ${c.mastery_state === "unseen" ? "border-blue-500 text-blue-500" : "border-amber-500 text-amber-500"}`}
                    >
                      {c.mastery_state ?? "due"}
                    </Badge>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">All caught up! No cards due today.</p>
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
