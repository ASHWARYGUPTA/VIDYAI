"use client";
import { useQuery } from "@tanstack/react-query";
import { progressApi } from "@/lib/api/endpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart2, TrendingUp, Brain, Target, Zap, CheckCircle2, BookOpen } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, LineChart, Line, ReferenceLine,
} from "recharts";

/* ─── types ─────────────────────────────────────────────────────── */
interface WeekSnap {
  week_start: string;
  overall_score: number;
  concepts_mastered: number;
  revision_completion_rate: number;
  test_accuracy: number;
  subject_scores: Record<string, number>;
}

interface HeatDay {
  activity_date: string;
  xp_earned: number;
  study_minutes: number;
  cards_reviewed: number;
  avg_retention_score: number;
}

/* ─── helpers ────────────────────────────────────────────────────── */
function retentionClass(score: number, hasActivity: boolean) {
  if (!hasActivity) return "bg-gray-100";
  if (score >= 0.75) return "bg-green-500";
  if (score >= 0.50) return "bg-yellow-400";
  if (score >= 0.25) return "bg-orange-400";
  return "bg-red-400";
}

function weekLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const SUBJECT_COLORS: Record<string, string> = {
  Physics: "#2563eb",
  Chemistry: "#10b981",
  Mathematics: "#8b5cf6",
  Biology: "#f59e0b",
};

/* ─── custom tooltip ─────────────────────────────────────────────── */
function WeekTooltip({ active, payload, label }: { active?: boolean; payload?: {name:string;value:number;color:string}[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-xl rounded-2xl px-4 py-3 text-xs">
      <p className="font-semibold text-gray-700 mb-2">Week of {weekLabel(label ?? "")}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="flex items-center justify-between gap-4">
          <span>{p.name}</span>
          <span className="font-bold">{typeof p.value === "number" ? p.value.toFixed(1) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

/* ─── page ───────────────────────────────────────────────────────── */
export default function ProgressPage() {
  const { data: dash, isLoading: dashLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => progressApi.dashboard(),
  });
  const { data: heatmap, isLoading: heatLoading } = useQuery({
    queryKey: ["heatmap"],
    queryFn: () => progressApi.heatmap({ months: 3 }),
  });
  const { data: weeklyRaw, isLoading: weekLoading } = useQuery({
    queryKey: ["weekly-progress"],
    queryFn: () => progressApi.weekly(),
  });
  const { data: xpData, isLoading: xpLoading } = useQuery({
    queryKey: ["xp"],
    queryFn: () => progressApi.xp(),
  });

  if (dashLoading) return (
    <div className="p-8 space-y-6">
      <Skeleton className="h-8 w-48 rounded-xl" />
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );

  const masteryDist = (dash as { knowledge_summary?: Record<string, number> })?.knowledge_summary ?? {};
  const weeks: WeekSnap[] = (weeklyRaw as { weeks?: WeekSnap[] })?.weeks ?? [];
  const heatDays: HeatDay[] = (heatmap as { days?: HeatDay[] })?.days ?? [];

  // Derive cumulative mastered for trend line
  let runningMastered = 0;
  const weekChartData = weeks.map(w => {
    runningMastered += w.concepts_mastered ?? 0;
    return {
      week_start: w.week_start,
      "Overall Score": Math.round(w.overall_score ?? 0),
      "Revision %": Math.round(w.revision_completion_rate ?? 0),
      "Test Accuracy": Math.round(w.test_accuracy ?? 0),
      concepts_mastered: w.concepts_mastered ?? 0,
      ...(w.subject_scores ?? {}),
    };
  });

  // Latest week subject breakdown
  const latestWeek = weeks[weeks.length - 1];
  const subjectData = latestWeek
    ? Object.entries(latestWeek.subject_scores ?? {}).map(([name, score]) => ({ name, score: Math.round(score) }))
    : [];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20">
          <BarChart2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Progress</h1>
          <p className="text-sm text-gray-400">Your learning journey at a glance</p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="bg-white border border-gray-100 shadow-sm rounded-xl p-1">
          <TabsTrigger value="overview"   className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow">Overview</TabsTrigger>
          <TabsTrigger value="weekly"     className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow">Weekly Curve</TabsTrigger>
          <TabsTrigger value="xp"         className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow">XP &amp; Badges</TabsTrigger>
          <TabsTrigger value="heatmap"    className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow">Activity</TabsTrigger>
        </TabsList>

        {/* ════ OVERVIEW ════ */}
        <TabsContent value="overview" className="mt-5 space-y-5">
          {/* Mastery stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { key: "mastered", label: "Mastered",  icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50",  bar: "from-green-500 to-green-600" },
              { key: "learning", label: "Learning",  icon: BookOpen,     color: "text-blue-600",  bg: "bg-blue-50",   bar: "from-blue-500 to-blue-600" },
              { key: "weak",     label: "Weak",      icon: Target,       color: "text-red-600",   bg: "bg-red-50",    bar: "from-red-400 to-red-500" },
              { key: "new",      label: "New",       icon: Brain,        color: "text-gray-600",  bg: "bg-gray-50",   bar: "from-gray-400 to-gray-500" },
            ].map(({ key, label, icon: Icon, color, bg, bar }) => (
              <Card key={key} className="border-0 shadow-md rounded-2xl bg-white">
                <CardContent className="p-5">
                  <div className={`inline-flex p-2 rounded-xl ${bg} mb-3`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{masteryDist[key] ?? 0}</p>
                  <p className="text-sm text-gray-400 mt-0.5">{label} concepts</p>
                  <div className={`h-1 rounded-full bg-gradient-to-r ${bar} mt-3`} />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Subject scores - latest week */}
          {subjectData.length > 0 && (
            <Card className="border-0 shadow-md rounded-2xl bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-gray-800">Subject Scores — This Week</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {subjectData.map(({ name, score }) => (
                  <div key={name} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">{name}</span>
                      <span className="font-bold" style={{ color: SUBJECT_COLORS[name] ?? "#2563eb" }}>{score}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${score}%`, backgroundColor: SUBJECT_COLORS[name] ?? "#2563eb" }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ════ WEEKLY CURVE ════ */}
        <TabsContent value="weekly" className="mt-5 space-y-5">

          {/* Summary row */}
          {!weekLoading && weeks.length > 0 && (() => {
            const latest = weeks[weeks.length - 1];
            const prev   = weeks[weeks.length - 2];
            const delta  = prev ? Math.round((latest.overall_score ?? 0) - (prev.overall_score ?? 0)) : 0;
            return (
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Overall Score",    value: `${Math.round(latest.overall_score ?? 0)}%`,       delta },
                  { label: "Revision Done",    value: `${Math.round(latest.revision_completion_rate ?? 0)}%`, delta: null },
                  { label: "Concepts Mastered",value: latest.concepts_mastered ?? 0,                      delta: null },
                ].map(({ label, value, delta: d }) => (
                  <Card key={label} className="border-0 shadow-md rounded-2xl bg-white">
                    <CardContent className="p-5">
                      <p className="text-3xl font-bold text-gray-900">{value}</p>
                      <p className="text-xs text-gray-400 mt-1">{label}</p>
                      {d !== null && (
                        <p className={`text-xs font-semibold mt-1 ${d >= 0 ? "text-green-600" : "text-red-500"}`}>
                          {d >= 0 ? "↑" : "↓"} {Math.abs(d)}% vs last week
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })()}

          {/* Main performance curve */}
          <Card className="border-0 shadow-md rounded-2xl bg-white">
            <CardHeader className="pb-0">
              <CardTitle className="text-base text-gray-800">Performance Trend</CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">Overall score, revision rate & test accuracy over time</p>
            </CardHeader>
            <CardContent className="pt-4">
              {weekLoading ? <Skeleton className="h-72 rounded-xl" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={weekChartData} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gOverall" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gRevision" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gTest" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="week_start" tick={{ fontSize: 11, fill: "#9ca3af" }}
                      tickFormatter={weekLabel} interval="preserveStartEnd"
                      axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#9ca3af" }} unit="%" axisLine={false} tickLine={false} width={36} />
                    <Tooltip content={<WeekTooltip />} />
                    <ReferenceLine y={75} stroke="#22c55e" strokeDasharray="4 3" strokeWidth={1} label={{ value: "75%", fontSize: 10, fill: "#22c55e", position: "insideTopLeft" }} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                    <Area type="monotone" dataKey="Overall Score"  stroke="#2563eb" strokeWidth={2.5} fill="url(#gOverall)"  dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "white" }} />
                    <Area type="monotone" dataKey="Revision %"    stroke="#10b981" strokeWidth={2}   fill="url(#gRevision)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "white" }} />
                    <Area type="monotone" dataKey="Test Accuracy" stroke="#8b5cf6" strokeWidth={2}   fill="url(#gTest)"     dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "white" }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Concepts mastered per week bars */}
          <Card className="border-0 shadow-md rounded-2xl bg-white">
            <CardHeader className="pb-0">
              <CardTitle className="text-base text-gray-800">Concepts Mastered per Week</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {weekLoading ? <Skeleton className="h-48 rounded-xl" /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weekChartData} margin={{ top: 4, right: 16, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="week_start" tick={{ fontSize: 11, fill: "#9ca3af" }}
                      tickFormatter={weekLabel} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip content={<WeekTooltip />} />
                    <Bar dataKey="concepts_mastered" name="Concepts Mastered" fill="#2563eb" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Subject breakdown line */}
          {Object.keys(SUBJECT_COLORS).some(s => (weekChartData[0] as Record<string, unknown>)?.[s] !== undefined) && (
            <Card className="border-0 shadow-md rounded-2xl bg-white">
              <CardHeader className="pb-0">
                <CardTitle className="text-base text-gray-800">Subject Score Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={weekChartData} margin={{ top: 4, right: 16, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="week_start" tick={{ fontSize: 11, fill: "#9ca3af" }}
                      tickFormatter={weekLabel} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#9ca3af" }} unit="%" axisLine={false} tickLine={false} width={36} />
                    <Tooltip content={<WeekTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                    {Object.entries(SUBJECT_COLORS).map(([name, color]) =>
                      (weekChartData[0] as Record<string, unknown>)?.[name] !== undefined ? (
                        <Line key={name} type="monotone" dataKey={name} stroke={color} strokeWidth={2}
                          dot={{ r: 3, fill: color, strokeWidth: 0 }}
                          activeDot={{ r: 6, stroke: "white", strokeWidth: 2 }} />
                      ) : null
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ════ XP & BADGES ════ */}
        <TabsContent value="xp" className="mt-5 space-y-5">
          {xpLoading ? <Skeleton className="h-32 rounded-2xl" /> : (
            <>
              <Card className="border-0 shadow-md rounded-2xl overflow-hidden bg-white">
                <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-4xl font-bold text-gray-900">{xpData?.total_xp ?? 0} <span className="text-lg text-gray-400 font-normal">XP</span></p>
                      <p className="text-sm text-gray-500 mt-1">Level {xpData?.level ?? 1}</p>
                    </div>
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                      <Zap className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{xpData?.total_xp ?? 0} XP</span>
                      <span>{xpData?.next_level_xp ?? 500} XP</span>
                    </div>
                    <Progress value={Math.min(100, ((xpData?.total_xp ?? 0) / (xpData?.next_level_xp ?? 500)) * 100)} className="h-2 rounded-full" />
                  </div>
                </CardContent>
              </Card>

              {(xpData?.badges?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <h2 className="text-sm font-semibold text-gray-700">Badges Earned</h2>
                  <div className="flex flex-wrap gap-2">
                    {(xpData?.badges ?? []).map((b: { id: string; name: string }) => (
                      <Badge key={b.id} className="gap-1.5 py-1.5 px-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0 shadow-sm rounded-xl">
                        ⚡ {b.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-gray-700">Recent Activity</h2>
                <div className="space-y-2">
                  {((xpData?.ledger ?? []) as { activity_date: string; xp_earned: number; study_minutes: number }[]).slice(0, 10).map(entry => (
                    <div key={entry.activity_date} className="flex items-center gap-3 rounded-2xl border border-gray-100 p-3.5 hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                      <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                        <Zap className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">
                          {new Date(entry.activity_date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                        </p>
                        <p className="text-xs text-gray-400">{entry.study_minutes}m studied</p>
                      </div>
                      <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 font-semibold">+{entry.xp_earned} XP</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* ════ ACTIVITY HEATMAP ════ */}
        <TabsContent value="heatmap" className="mt-5">
          <Card className="border-0 shadow-md rounded-2xl bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-gray-800">Retention Heatmap</CardTitle>
              <p className="text-xs text-gray-400">Colour = average retention score for that day</p>
            </CardHeader>
            <CardContent>
              {heatLoading ? <Skeleton className="h-36 rounded-xl" /> : (
                <div className="space-y-4">
                  <div className="flex gap-1 flex-wrap">
                    {heatDays.map(day => {
                      const hasActivity = (day.xp_earned ?? 0) > 0 || (day.cards_reviewed ?? 0) > 0;
                      const score = day.avg_retention_score ?? 0;
                      return (
                        <div
                          key={day.activity_date}
                          title={`${day.activity_date} · ${Math.round(score * 100)}% retention · ${day.xp_earned ?? 0} XP · ${day.study_minutes ?? 0}m`}
                          className={`h-4 w-4 rounded-sm cursor-default transition-transform hover:scale-125 ${retentionClass(score, hasActivity)}`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                    {[
                      { cls: "bg-gray-100",   label: "No activity" },
                      { cls: "bg-red-400",    label: "Critical <25%" },
                      { cls: "bg-orange-400", label: "Weak 25–50%" },
                      { cls: "bg-yellow-400", label: "Moderate 50–75%" },
                      { cls: "bg-green-500",  label: "Strong 75%+" },
                    ].map(({ cls, label }) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <div className={`h-3 w-3 rounded-sm ${cls}`} />
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
