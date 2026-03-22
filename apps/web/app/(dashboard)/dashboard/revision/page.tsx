"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, RotateCcw, Flame } from "lucide-react";
import { toast } from "sonner";
import { retentionApi } from "@/lib/api/endpoints";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { masteryColor } from "@/lib/utils";

// quality_score 1-5 mapping
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
    queryFn: retentionApi.today,
  });

  const { data: streakData } = useQuery({
    queryKey: ["streak"],
    queryFn: retentionApi.streak,
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
        <Skeleton className="h-64 w-full max-w-lg mx-auto" />
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
        <div className="rounded-full bg-green-100 p-6 mb-4">
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Session complete!</h2>
        <p className="text-muted-foreground mb-6">You reviewed {done} cards today.</p>
        <Button onClick={() => { setCurrentIdx(0); setSessionDone(0); qc.invalidateQueries({ queryKey: ["deck-today"] }); }}>
          Start new session
        </Button>
      </div>
    );
  }

  const card = cards[currentIdx];
  // Supabase join returns the joined table as "concepts" (table name)
  const concept = (card as { concepts?: { name?: string; description?: string; key_formulas?: string; chapter?: { name?: string }; mastery_state?: string } }).concepts;
  const masteryState = (card as { mastery_state?: string }).mastery_state ?? "new";
  const conceptId = card.concept_id as string;

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Revision</h1>
          <p className="text-sm text-muted-foreground">{remaining} cards remaining</p>
        </div>
        {currentStreak > 0 && (
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium">{currentStreak} day streak</span>
          </div>
        )}
      </div>

      <Progress value={progress} />

      {/* Flashcard */}
      <div
        className="flashcard-container cursor-pointer select-none h-64"
        onClick={() => setFlipped((f) => !f)}
      >
        <div className={`flashcard h-full ${flipped ? "flipped" : ""}`}>
          <Card className="flashcard-front h-full flex flex-col items-center justify-center text-center p-8">
            <Badge variant="outline" className={`mb-4 ${masteryColor(masteryState)}`}>
              {masteryState}
            </Badge>
            <h2 className="text-2xl font-bold">{concept?.name ?? "Concept"}</h2>
            <p className="text-sm text-muted-foreground mt-4">Tap to reveal</p>
          </Card>
          <Card className="flashcard-back h-full flex flex-col items-center justify-center text-center p-8">
            <p className="text-xs text-muted-foreground mb-2">{concept?.name}</p>
            <p className="text-sm leading-relaxed">
              {concept?.description ?? "No description available. Check your notes."}
            </p>
            {concept?.key_formulas && (
              <div className="mt-4 rounded-md bg-muted px-4 py-2 font-mono text-xs">
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
              className={`flex flex-col h-16 gap-1 ${color}`}
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
        <p className="text-center text-sm text-muted-foreground">
          Tap the card to reveal the answer
        </p>
      )}
    </div>
  );
}
