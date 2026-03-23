"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, RotateCcw, Flame, TrendingDown, Sparkles } from "lucide-react";
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
  { value: 1, label: "Again", icon: XCircle, color: "text-red-500 border-red-200 hover:bg-red-50" },
  { value: 2, label: "Hard", icon: RotateCcw, color: "text-amber-500 border-amber-200 hover:bg-amber-50" },
  { value: 3, label: "Good", icon: CheckCircle, color: "text-green-500 border-green-200 hover:bg-green-50" },
  { value: 5, label: "Easy", icon: CheckCircle, color: "text-blue-500 border-blue-200 hover:bg-blue-50" },
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
    onSuccess: () => {
      setFlipped(false);
      setCurrentIdx((i) => i + 1);
      setSessionDone((n) => n + 1);
      qc.invalidateQueries({ queryKey: ["deck-today"] });
    },
    onError: () => toast.error("Failed to record review"),
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full max-w-lg mx-auto rounded-xl" />
      </div>
    );
  }

  const cards = deck?.cards ?? [];
  const totalDue = deck?.total_due ?? 0;
  const done = sessionDone;
  const remaining = cards.length - currentIdx;
  const progress = totalDue ? Math.round((done / (done + remaining)) * 100) : 0;
  const currentStreak = (streakData as { streak?: { current_streak?: number } })?.streak?.current_streak ?? 0;

  if (!cards.length || currentIdx >= cards.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="rounded-2xl bg-gradient-to-br from-green-100 to-green-50 p-8 mb-4 shadow-lg shadow-green-500/10">
          <CheckCircle className="h-14 w-14 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Session complete! 🎉</h2>
        <p className="text-gray-500 mb-6">You reviewed {done} cards today.</p>
        <Button
          className="bg-gradient-to-r from-blue-600 to-blue-500 shadow-md shadow-blue-500/20"
          onClick={() => { setCurrentIdx(0); setSessionDone(0); qc.invalidateQueries({ queryKey: ["deck-today"] }); }}
        >
          <Sparkles className="h-4 w-4 mr-2" /> Start new session
        </Button>
      </div>
    );
  }

  const card = cards[currentIdx];
  const concept = (card as { concepts?: { name?: string; description?: string; key_formulas?: string; chapter?: { name?: string }; mastery_state?: string } }).concepts;
  const masteryState = (card as { mastery_state?: string }).mastery_state ?? "new";
  const conceptId = card.concept_id as string;

  const curve = (curveData as { curve?: { date: string; avg_retention: number | null }[]; next_review_due?: string; current_avg_retention?: number } | undefined);
  const nextDue = curve?.next_review_due;
  const currentAvg = curve?.current_avg_retention ?? 0;

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Revision</h1>
          <p className="text-sm text-gray-500">{remaining} cards remaining</p>
        </div>
        {currentStreak > 0 && (
          <div className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-full">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium text-orange-700">{currentStreak} day streak</span>
          </div>
        )}
      </div>

      <Tabs defaultValue="flashcards">
        <TabsList className="bg-white border border-blue-100/60">
          <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
          <TabsTrigger value="curve">
            <TrendingDown className="h-3.5 w-3.5 mr-1" />
            Retention Curve
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flashcards" className="space-y-6 mt-4">
          <Progress value={progress} />

          {/* Flashcard */}
          <div
            className="flashcard-container cursor-pointer select-none h-64"
            onClick={() => setFlipped((f) => !f)}
          >
            <div className={`flashcard h-full ${flipped ? "flipped" : ""}`}>
              <Card className="flashcard-front h-full flex flex-col items-center justify-center text-center p-8 border-blue-100/60 shadow-lg shadow-blue-500/5 bg-white">
                <Badge variant="outline" className={`mb-4 ${masteryColor(masteryState)}`}>
                  {masteryState}
                </Badge>
                <h2 className="text-2xl font-bold text-gray-900">{concept?.name ?? "Concept"}</h2>
                <p className="text-sm text-gray-400 mt-4">Tap to reveal</p>
              </Card>
              <Card className="flashcard-back h-full flex flex-col items-center justify-center text-center p-8 border-blue-100/60 shadow-lg shadow-blue-500/5 bg-gradient-to-b from-white to-blue-50/30">
                <p className="text-xs text-blue-600 mb-2 font-medium">{concept?.name}</p>
                <p className="text-sm leading-relaxed text-gray-700">
                  {concept?.description ?? "No description available. Check your notes."}
                </p>
                {concept?.key_formulas && (
                  <div className="mt-4 rounded-xl bg-blue-50 border border-blue-100 px-4 py-2 font-mono text-xs text-blue-800">
                    {concept.key_formulas}
                  </div>
                )}
              </Card>
            </div>
          </div>

          {flipped && (
            <div className="grid grid-cols-4 gap-2">
              {RATINGS.map(({ value, label, icon: Icon, color }) => (
                <Button
                  key={value}
                  variant="outline"
                  className={`flex flex-col h-16 gap-1 rounded-xl ${color}`}
                  onClick={() => reviewMutation.mutate({ conceptId, qualityScore: value })}
                  disabled={reviewMutation.isPending}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>
          )}

          {!flipped && (
            <p className="text-center text-sm text-gray-400">
              Tap the card to reveal the answer
            </p>
          )}
        </TabsContent>

        <TabsContent value="curve" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-blue-100/50 bg-white">
              <CardContent className="pt-4">
                <p className="text-2xl font-bold text-gray-900">{currentAvg}%</p>
                <p className="text-xs text-gray-500">Current avg retention</p>
              </CardContent>
            </Card>
            <Card className="border-blue-100/50 bg-white">
              <CardContent className="pt-4">
                <p className="text-2xl font-bold text-gray-900">{nextDue ? new Date(nextDue).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}</p>
                <p className="text-xs text-gray-500">Next review due</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-blue-100/50 bg-white">
            <CardHeader>
              <CardTitle className="text-sm text-gray-800">Forgetting Curve — Last 30 Days</CardTitle>
            </CardHeader>
            <CardContent>
              {curveLoading ? (
                <Skeleton className="h-48 rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={(curve?.curve ?? []).filter((d) => d.avg_retention !== null)}>
                    <defs>
                      <linearGradient id="retentionGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-blue-100" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      tickFormatter={(v: string) => v?.slice(5)}
                      interval="preserveStartEnd"
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#9ca3af" }} unit="%" />
                    <Tooltip
                      contentStyle={{ background: "white", border: "1px solid #dbeafe", borderRadius: "12px", fontSize: 12, boxShadow: "0 4px 12px -2px rgba(37,99,235,0.1)" }}
                      formatter={(v: number) => [`${v}%`, "Retention"]}
                      labelFormatter={(l: string) => new Date(l).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    />
                    <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: "50%", fontSize: 10, fill: "#f59e0b" }} />
                    <ReferenceLine y={75} stroke="#22c55e" strokeDasharray="4 2" label={{ value: "75%", fontSize: 10, fill: "#22c55e" }} />
                    {nextDue && (
                      <ReferenceLine x={nextDue} stroke="#2563eb" strokeDasharray="4 2" label={{ value: "Next review", fontSize: 10, fill: "#2563eb", position: "insideTopRight" }} />
                    )}
                    <Area
                      type="monotone"
                      dataKey="avg_retention"
                      stroke="#2563eb"
                      strokeWidth={2}
                      fill="url(#retentionGrad)"
                      dot={false}
                      connectNulls
                    />
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
