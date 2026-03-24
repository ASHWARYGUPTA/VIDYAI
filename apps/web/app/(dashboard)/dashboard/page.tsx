"use client";
import { useQuery } from "@tanstack/react-query";
import { Flame, BookOpen, Calendar, Zap, ArrowRight, CheckCircle2, Clock, Target, TrendingUp } from "lucide-react";
import Link from "next/link";
import { progressApi, retentionApi } from "@/lib/api/endpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/* ─── helpers ─────────────────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function xpToLevel(xp: number): { level: number; pct: number; next: number } {
  const thresholds = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 6000, 8000];
  let level = 0;
  for (let i = 0; i < thresholds.length - 1; i++) {
    if (xp >= thresholds[i]) level = i + 1;
  }
  const cur = thresholds[level - 1] ?? 0;
  const next = thresholds[level] ?? thresholds[thresholds.length - 1];
  return { level, pct: Math.round(((xp - cur) / (next - cur)) * 100), next };
}

/* ─── XP intensity for heatmap cell ─────────────────────────────── */
function xpColor(xp: number): string {
  if (xp === 0)   return "bg-gray-100";
  if (xp < 30)    return "bg-green-200";
  if (xp < 70)    return "bg-green-400";
  if (xp < 120)   return "bg-green-500";
  return "bg-green-700";
}

/* ─── LeetCode-style heatmap ────────────────────────────────────── */
interface HeatDay { activity_date: string; xp_earned: number; cards_reviewed: number; study_minutes: number }

function ActivityHeatmap({ days }: { days: HeatDay[] }) {
  const dayMap: Record<string, HeatDay> = {};
  for (const d of days) dayMap[d.activity_date] = d;

  // Build last 26 weeks (Mon–Sun columns)
  const today = new Date();
  const totalDays = 26 * 7;
  // Align to Monday
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - totalDays + 1);
  // roll back to Monday
  const dayOfWeek = startDate.getDay(); // 0=Sun
  startDate.setDate(startDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  const weeks: Date[][] = [];
  let cur = new Date(startDate);
  while (cur <= today) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  const months: { label: string; col: number }[] = [];
  weeks.forEach((week, wi) => {
    const first = week[0];
    if (first.getDate() <= 7) {
      months.push({ label: first.toLocaleString("en-IN", { month: "short" }), col: wi });
    }
  });

  const totalXp = days.reduce((s, d) => s + (d.xp_earned || 0), 0);
  const activeDays = days.filter(d => d.xp_earned > 0).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{activeDays} active days in the last 6 months</span>
        <div className="flex items-center gap-1.5">
          <span>Less</span>
          {["bg-gray-100","bg-green-200","bg-green-400","bg-green-500","bg-green-700"].map(c => (
            <span key={c} className={`h-3 w-3 rounded-sm ${c}`} />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="relative" style={{ minWidth: `${weeks.length * 14 + 24}px` }}>
          {/* Month labels */}
          <div className="flex mb-1 pl-6" style={{ gap: "2px" }}>
            {weeks.map((_, wi) => {
              const mo = months.find(m => m.col === wi);
              return (
                <div key={wi} style={{ width: 12 }} className="text-[9px] text-gray-400 shrink-0">
                  {mo?.label ?? ""}
                </div>
              );
            })}
          </div>

          <div className="flex gap-0.5 pl-6">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((day) => {
                  const iso = day.toISOString().slice(0, 10);
                  const data = dayMap[iso];
                  const isFuture = day > today;
                  const color = isFuture ? "bg-gray-50" : xpColor(data?.xp_earned ?? 0);
                  return (
                    <TooltipProvider key={iso} delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={`h-3 w-3 rounded-sm ${color} ${!isFuture ? "cursor-pointer hover:ring-1 hover:ring-blue-400 hover:ring-offset-1" : ""} transition-all`} />
                        </TooltipTrigger>
                        {!isFuture && (
                          <TooltipContent side="top" className="text-xs bg-gray-900 text-white border-gray-700 rounded-lg px-3 py-2">
                            <p className="font-semibold">{day.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</p>
                            {data?.xp_earned ? (
                              <>
                                <p className="text-blue-300">{data.xp_earned} XP earned</p>
                                <p className="text-gray-400">{data.cards_reviewed ?? 0} cards · {data.study_minutes ?? 0} min</p>
                              </>
                            ) : (
                              <p className="text-gray-400">No activity</p>
                            )}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Day labels */}
          <div className="absolute left-0 top-5 flex flex-col gap-0.5">
            {["M","","W","","F","","S"].map((l, i) => (
              <div key={i} className="text-[9px] text-gray-400 h-3 flex items-center">{l}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 text-xs text-gray-500 pt-1">
        <span className="flex items-center gap-1.5"><Zap className="h-3 w-3 text-amber-500" /><strong className="text-gray-700">{totalXp.toLocaleString()}</strong> total XP</span>
        <span className="flex items-center gap-1.5"><BookOpen className="h-3 w-3 text-blue-500" /><strong className="text-gray-700">{days.reduce((s,d) => s+(d.cards_reviewed||0),0).toLocaleString()}</strong> cards reviewed</span>
      </div>
    </div>
  );
}

/* ─── interfaces ─────────────────────────────────────────────────── */
interface DashResponse {
  streak?: { current_streak?: number };
  due_cards_count?: number;
  weekly_xp?: number;
  today_plan?: { slots?: PlanSlot[]; completion_percent?: number };
}
interface PlanSlot {
  id?: string;
  subject?: { name: string };
  topic?: string;
  duration_minutes: number;
  is_completed?: boolean;
  status?: string;
  slot_type?: string;
}

const SUBJECT_COLORS: Record<string, string> = {
  Physics: "bg-blue-100 text-blue-700 border-blue-200",
  Chemistry: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Mathematics: "bg-violet-100 text-violet-700 border-violet-200",
  Biology: "bg-green-100 text-green-700 border-green-200",
};

/* ─── page ───────────────────────────────────────────────────────── */
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
  const { data: heatmapData, isLoading: heatmapLoading } = useQuery({
    queryKey: ["heatmap"],
    queryFn: () => progressApi.heatmap({ months: 6 }),
    staleTime: 10 * 60 * 1000,
  });

  const d = dash as DashResponse | undefined;
  const streak = d?.streak?.current_streak ?? 0;
  const weeklyXp = d?.weekly_xp ?? 0;
  const planRaw = d?.today_plan as { slots?: PlanSlot[]; completion_percent?: number } | null | undefined;
  const slots = planRaw?.slots ?? [];
  const completedSlots = slots.filter(s => s.is_completed || s.status === "completed").length;
  const totalSlots = slots.length;
  const planPct = planRaw?.completion_percent ?? (totalSlots ? Math.round((completedSlots / totalSlots) * 100) : 0);
  const cards = (deck as { cards?: unknown[] })?.cards ?? [];
  const heatDays: HeatDay[] = (heatmapData as { days?: HeatDay[] })?.days ?? [];
  const totalXp = heatDays.reduce((s, d) => s + (d.xp_earned || 0), 0);
  const { level, pct: lvlPct, next: nextXp } = xpToLevel(totalXp);

  if (dashLoading) return (
    <div className="p-8 space-y-6">
      <Skeleton className="h-9 w-56 rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

      {/* ── Greeting ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Good {getGreeting()} 👋</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <Link href="/dashboard/revision">
          <Button className="bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg shadow-blue-500/20 rounded-xl">
            Start Revision <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </Link>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Flame,    label: "Day Streak",   value: streak,         sub: "consecutive days",        gradient: "from-orange-400 to-red-500",    shadow: "shadow-orange-500/20" },
          { icon: BookOpen, label: "Due Cards",     value: (deck as {total_due?:number})?.total_due ?? 0, sub: `${(deck as {new_cards?:number})?.new_cards ?? 0} new today`, gradient: "from-blue-500 to-blue-600", shadow: "shadow-blue-500/20" },
          { icon: Target,   label: "Plan Progress", value: `${planPct}%`,  sub: `${completedSlots}/${totalSlots} slots`,  gradient: "from-emerald-500 to-emerald-600", shadow: "shadow-emerald-500/20" },
          { icon: Zap,      label: "Weekly XP",     value: weeklyXp,       sub: `Level ${level}`,          gradient: "from-amber-400 to-amber-500",   shadow: "shadow-amber-500/20" },
        ].map(({ icon: Icon, label, value, sub, gradient, shadow }) => (
          <Card key={label} className="border-0 shadow-md bg-white rounded-2xl overflow-hidden">
            <CardContent className="p-5">
              <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${gradient} shadow-lg ${shadow} mb-3`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              <p className="text-[11px] text-gray-300 mt-0.5">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Activity Heatmap ── */}
      <Card className="border-0 shadow-md bg-white rounded-2xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50">
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base text-gray-900">Activity</CardTitle>
                <p className="text-xs text-gray-400">6-month study streak</p>
              </div>
            </div>
            {/* XP Level bar */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-700">Level {level}</p>
                <p className="text-[10px] text-gray-400">{totalXp.toLocaleString()} / {nextXp.toLocaleString()} XP</p>
              </div>
              <div className="w-24">
                <Progress value={lvlPct} className="h-2 rounded-full bg-blue-100" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {heatmapLoading ? (
            <Skeleton className="h-28 w-full rounded-xl" />
          ) : (
            <ActivityHeatmap days={heatDays} />
          )}
        </CardContent>
      </Card>

      {/* ── Bottom row ── */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Today's Study Plan */}
        <Card className="border-0 shadow-md bg-white rounded-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <CardTitle className="text-base text-gray-900">Today&apos;s Plan</CardTitle>
              </div>
              <Link href="/dashboard/planner" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
                Full planner <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {totalSlots > 0 && (
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{completedSlots} of {totalSlots} completed</span>
                  <span>{planPct}%</span>
                </div>
                <Progress value={planPct} className="h-1.5 rounded-full bg-gray-100" />
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-2.5">
            {slots.length ? (
              slots.slice(0, 6).map((slot, i) => {
                const done = slot.is_completed || slot.status === "completed";
                const subjectColor = SUBJECT_COLORS[slot.subject?.name ?? ""] ?? "bg-gray-100 text-gray-600 border-gray-200";
                return (
                  <div key={slot.id ?? i}
                    className={`group flex items-center gap-3 rounded-2xl border p-3.5 transition-all ${
                      done
                        ? "bg-gray-50 border-gray-100 opacity-60"
                        : "border-gray-100 hover:border-blue-200 hover:bg-blue-50/40 hover:shadow-sm"
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${done ? "bg-green-100" : "bg-blue-50 group-hover:bg-blue-100"}`}>
                      {done
                        ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                        : <BookOpen className="h-4 w-4 text-blue-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${done ? "text-gray-400 line-through" : "text-gray-800"}`}>
                        {slot.topic || slot.subject?.name || "Study session"}
                      </p>
                      {slot.subject?.name && slot.topic && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">{slot.subject.name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border ${subjectColor} font-medium`}>
                        {slot.subject?.name?.slice(0, 4) ?? "—"}
                      </Badge>
                      <div className="flex items-center gap-0.5 text-xs text-gray-400">
                        <Clock className="h-3 w-3" />
                        {slot.duration_minutes}m
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">No plan for today</p>
                  <p className="text-xs text-gray-400 mt-0.5">Generate a personalised study schedule</p>
                </div>
                <Link href="/dashboard/planner">
                  <Button variant="outline" size="sm" className="rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50 mt-1">
                    Generate plan
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revision Queue */}
        <Card className="border-0 shadow-md bg-white rounded-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-gray-400" />
                <CardTitle className="text-base text-gray-900">Revision Queue</CardTitle>
              </div>
              <Link href="/dashboard/revision" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
                Start <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {deckLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)
            ) : cards.length ? (
              <>
                {(cards as {concept_id:string;concepts?:{name?:string};mastery_state?:string}[]).slice(0, 5).map((card, i) => {
                  const stateColors: Record<string, string> = {
                    learning:  "bg-amber-50  text-amber-700  border-amber-200",
                    reviewing: "bg-blue-50   text-blue-700   border-blue-200",
                    forgotten: "bg-red-50    text-red-700    border-red-200",
                    unseen:    "bg-gray-50   text-gray-600   border-gray-200",
                    mastered:  "bg-green-50  text-green-700  border-green-200",
                  };
                  const state = card.mastery_state ?? "unseen";
                  return (
                    <div key={card.concept_id ?? i} className="flex items-center gap-3 rounded-2xl border border-gray-100 p-3.5 hover:border-blue-200 hover:bg-blue-50/40 hover:shadow-sm transition-all">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${
                        state === "mastered" ? "bg-green-500" :
                        state === "reviewing" ? "bg-blue-500" :
                        state === "forgotten" ? "bg-red-500" :
                        state === "learning" ? "bg-amber-400" : "bg-gray-300"
                      }`} />
                      <p className="flex-1 text-sm font-medium text-gray-800 truncate">{card.concepts?.name ?? "Concept"}</p>
                      <Badge variant="outline" className={`text-[10px] shrink-0 border ${stateColors[state] ?? stateColors.unseen}`}>
                        {state}
                      </Badge>
                    </div>
                  );
                })}
                <Link href="/dashboard/revision" className="block">
                  <div className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blue-200 p-3 text-sm text-blue-500 hover:bg-blue-50 transition-colors cursor-pointer mt-1">
                    <Zap className="h-4 w-4" />
                    Review all {(deck as {total_due?:number})?.total_due ?? cards.length} cards
                  </div>
                </Link>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                <div className="h-12 w-12 rounded-2xl bg-green-50 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">All caught up!</p>
                  <p className="text-xs text-gray-400 mt-0.5">No cards due today — come back tomorrow.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
