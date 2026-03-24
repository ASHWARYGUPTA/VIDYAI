"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle, XCircle, RotateCcw, Flame, TrendingDown, Sparkles, Brain, BookOpen,
} from "lucide-react";
// CheckCircle kept for RATINGS array
import { toast } from "sonner";
import { retentionApi } from "@/lib/api/endpoints";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { masteryColor } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid,
} from "recharts";

const RATINGS = [
  { value: 1, label: "Again",  desc: "< 1 min", icon: XCircle,    bg: "bg-red-50   hover:bg-red-100   border-red-200   text-red-600",   bar: "bg-red-400"   },
  { value: 2, label: "Hard",   desc: "< 6 min", icon: RotateCcw,  bg: "bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-600", bar: "bg-amber-400" },
  { value: 3, label: "Good",   desc: "4 days",  icon: CheckCircle, bg: "bg-green-50 hover:bg-green-100 border-green-200 text-green-600", bar: "bg-green-400" },
  { value: 5, label: "Easy",   desc: "7 days",  icon: Sparkles,   bg: "bg-blue-50  hover:bg-blue-100  border-blue-200  text-blue-600",  bar: "bg-blue-400"  },
];

export default function RevisionPage() {
  const qc = useQueryClient();
  const [flipped, setFlipped] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sessionDone, setSessionDone] = useState(0);

  const { data: deck, isLoading } = useQuery({
    queryKey: ["deck-today"],
    queryFn: () => retentionApi.today(),
  });
  const { data: streakData } = useQuery({
    queryKey: ["streak"],
    queryFn: () => retentionApi.streak(),
  });
  const { data: curveData, isLoading: curveLoading } = useQuery({
    queryKey: ["forgetting-curve"],
    queryFn: () => retentionApi.forgettingCurve(),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ conceptId, qualityScore }: { conceptId: string; qualityScore: number }) =>
      retentionApi.review(conceptId, { quality_score: qualityScore }),
    onSuccess: (_, { }) => {
      setFlipped(false);
      setSessionDone((n) => n + 1);
      qc.invalidateQueries({ queryKey: ["deck-today"] }).then(() => {
        setCurrentIdx((i) => i + 1);
      });
    },
    onError: () => toast.error("Failed to record review"),
  });

  const cards   = deck?.cards ?? [];
  const totalDue = deck?.total_due ?? 0;
  const remaining = cards.length - currentIdx;
  const progress  = totalDue ? Math.round((sessionDone / (sessionDone + remaining)) * 100) : 0;
  const currentStreak = (streakData as { streak?: { current_streak?: number } })?.streak?.current_streak ?? 0;
  const curve     = curveData as { curve?: { date: string; avg_retention: number | null }[]; next_review_due?: string; current_avg_retention?: number } | undefined;
  const nextDue   = curve?.next_review_due;
  const currentAvg = curve?.current_avg_retention ?? 0;

  /* ─── Loading ─── */
  if (isLoading) return (
    <div className="p-8 space-y-5 max-w-3xl mx-auto">
      <Skeleton className="h-8 w-44 rounded-xl" />
      <Skeleton className="h-[420px] w-full rounded-3xl" />
      <div className="grid grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    </div>
  );


  const card        = currentIdx < cards.length ? cards[currentIdx] : null;
  const concept     = (card as { concepts?: { name?: string; description?: string; chapters?: { name?: string } } } | null)?.concepts;
  const masteryState = (card as { mastery_state?: string } | null)?.mastery_state ?? "new";
  const conceptId   = (card as { concept_id?: string } | null)?.concept_id ?? "";
  const sessionDone_total = sessionDone + remaining;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-blue-100">
            <Brain className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Revision</h1>
            <p className="text-sm text-gray-400">{remaining} cards left · {sessionDone} done</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {currentStreak > 0 && (
            <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-100 px-3.5 py-1.5 rounded-full">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-bold text-orange-700">{currentStreak}d streak</span>
            </div>
          )}
          {cards.length > 0 && <span className="text-sm text-gray-400">{Math.min(currentIdx + 1, cards.length)} / {cards.length}</span>}
        </div>
      </div>

      <Tabs defaultValue="flashcards">
        <TabsList className="bg-white border border-gray-100 shadow-sm rounded-xl p-1">
          <TabsTrigger value="flashcards" className="rounded-lg gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow">
            <BookOpen className="h-3.5 w-3.5" /> Flashcards
          </TabsTrigger>
          <TabsTrigger value="curve" className="rounded-lg gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow">
            <TrendingDown className="h-3.5 w-3.5" /> Retention Curve
          </TabsTrigger>
        </TabsList>

        {/* ════════════ FLASHCARDS ════════════ */}
        <TabsContent value="flashcards" className="space-y-4 mt-5">

          {!card ? (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
              <Sparkles className="h-10 w-10 text-blue-300" />
              <p className="text-lg font-semibold text-gray-500">No cards due right now.</p>
              <p className="text-sm text-gray-400">Check back later or add more concepts.</p>
            </div>
          ) : (
            <>
              {/* Progress */}
              <div className="flex items-center gap-3">
                <Progress value={progress} className="flex-1 h-2 rounded-full" />
                <span className="text-xs text-gray-400 font-medium tabular-nums">{sessionDone}/{sessionDone_total}</span>
              </div>

              {/* Flashcard */}
              <div
                className="flashcard-container w-full cursor-pointer select-none"
                style={{ height: "420px" }}
                onClick={() => setFlipped(f => !f)}
              >
                <div className={`flashcard h-full ${flipped ? "flipped" : ""}`}>

                  {/* FRONT */}
                  <div className="flashcard-front h-full rounded-3xl bg-white shadow-xl shadow-gray-200/80 border border-gray-100 flex flex-col items-center justify-center text-center p-10 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.03]"
                      style={{ backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
                    <div className="absolute top-5 left-5">
                      <Badge variant="outline" className={`text-xs font-semibold ${masteryColor(masteryState)}`}>{masteryState}</Badge>
                    </div>
                    {concept?.chapters?.name && (
                      <p className="text-xs font-semibold tracking-widest text-blue-400 uppercase mb-4">{concept.chapters.name}</p>
                    )}
                    <h2 className="text-4xl font-bold text-gray-900 leading-tight max-w-sm">{concept?.name ?? "Concept"}</h2>
                    <p className="text-gray-300 text-sm mt-8 flex items-center gap-1.5">
                      <span className="h-px w-8 bg-gray-200 inline-block" />
                      tap to reveal
                      <span className="h-px w-8 bg-gray-200 inline-block" />
                    </p>
                  </div>

                  {/* BACK */}
                  <div className="flashcard-back h-full rounded-3xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 shadow-xl shadow-blue-500/30 flex flex-col items-center justify-center text-center p-10 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10"
                      style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 0%, transparent 50%)" }} />
                    <p className="text-xs font-semibold tracking-widest text-blue-200 uppercase mb-5">{concept?.name}</p>
                    <p className="text-lg leading-relaxed text-white/90 max-w-md">
                      {concept?.description ?? "No description available."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Rating buttons */}
              {flipped ? (
                <div className="grid grid-cols-4 gap-3">
                  {RATINGS.map(({ value, label, desc, icon: Icon, bg, bar }) => (
                    <button
                      key={value}
                      className={`flex flex-col items-center justify-center gap-1.5 py-5 rounded-2xl border-2 transition-all ${bg} disabled:opacity-40`}
                      onClick={() => reviewMutation.mutate({ conceptId, qualityScore: value })}
                      disabled={reviewMutation.isPending}
                    >
                      <div className={`h-1.5 w-8 rounded-full ${bar} mb-1`} />
                      <Icon className="h-5 w-5" />
                      <span className="font-semibold text-sm">{label}</span>
                      <span className="text-xs opacity-50">{desc}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-gray-300 py-2">Rate yourself after flipping the card</p>
              )}
            </>
          )}
        </TabsContent>

        {/* ════════════ RETENTION CURVE ════════════ */}
        <TabsContent value="curve" className="space-y-5 mt-5">

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-0 rounded-2xl shadow-lg shadow-blue-500/10 bg-gradient-to-br from-blue-600 to-indigo-600 text-white overflow-hidden">
              <CardContent className="p-5">
                <p className="text-4xl font-bold">{currentAvg}%</p>
                <p className="text-sm text-blue-100 mt-1">Avg retention</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-100 rounded-2xl shadow-sm bg-white">
              <CardContent className="p-5">
                <p className="text-4xl font-bold text-gray-900">
                  {nextDue ? new Date(nextDue).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                </p>
                <p className="text-sm text-gray-400 mt-1">Next review</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-100 rounded-2xl shadow-sm bg-white">
              <CardContent className="p-5">
                <p className="text-4xl font-bold text-gray-900">{totalDue}</p>
                <p className="text-sm text-gray-400 mt-1">Due today</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card className="border border-gray-100 rounded-2xl shadow-sm bg-white">
            <CardHeader className="pb-0">
              <CardTitle className="text-base font-semibold text-gray-800">Forgetting Curve — Last 30 Days</CardTitle>
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 mt-2">
                <span className="flex items-center gap-1.5"><span className="h-2 w-5 rounded bg-amber-400 inline-block" />50% warning</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-5 rounded bg-green-400 inline-block" />75% target</span>
                {nextDue && <span className="flex items-center gap-1.5"><span className="h-2 w-5 rounded bg-blue-400 inline-block" />Next review</span>}
              </div>
            </CardHeader>
            <CardContent className="pt-4 pb-5">
              {curveLoading ? (
                <Skeleton className="h-80 w-full rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height={380}>
                  <AreaChart
                    data={(curve?.curve ?? []).filter(d => d.avg_retention !== null)}
                    margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }}
                      tickFormatter={(v: string) => v?.slice(5)} interval="preserveStartEnd"
                      axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#9ca3af" }} unit="%" axisLine={false} tickLine={false} width={38} />
                    <Tooltip
                      contentStyle={{ background: "white", border: "none", borderRadius: "14px", fontSize: 12, boxShadow: "0 10px 40px -4px rgba(37,99,235,0.15)" }}
                      formatter={(v: number) => [`${v}%`, "Retention"]}
                      labelFormatter={(l: string) => new Date(l).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      cursor={{ stroke: "#dbeafe", strokeWidth: 2 }}
                    />
                    <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="5 3" strokeWidth={1.5} label={{ value: "50%", fontSize: 10, fill: "#f59e0b", position: "insideTopLeft" }} />
                    <ReferenceLine y={75} stroke="#22c55e" strokeDasharray="5 3" strokeWidth={1.5} label={{ value: "75%", fontSize: 10, fill: "#22c55e", position: "insideTopLeft" }} />
                    {nextDue && <ReferenceLine x={nextDue} stroke="#2563eb" strokeDasharray="5 3" strokeWidth={1.5} />}
                    <Area type="monotone" dataKey="avg_retention" stroke="#2563eb" strokeWidth={2.5}
                      fill="url(#retGrad)" dot={{ r: 3, fill: "#2563eb", strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: "#2563eb", stroke: "white", strokeWidth: 2 }} connectNulls />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
