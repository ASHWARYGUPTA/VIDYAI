"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trophy, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

const OPTIONS = ["A", "B", "C", "D"] as const;
type Phase = "setup" | "test" | "result";

interface MCQQuestion {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  difficulty_level?: string;
}

function getOption(q: MCQQuestion, opt: typeof OPTIONS[number]) {
  return { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d }[opt];
}

export default function TestsPage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [config, setConfig] = useState({ exam_type: "JEE", mode: "practice", difficulty: "Medium", question_count: 10 });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ score: number; max_score: number; accuracy: number } | null>(null);
  const qc = useQueryClient();

  const { data: pastSessions, isLoading: sessLoading } = useQuery({
    queryKey: ["test-sessions"],
    queryFn: () => api.get<{ sessions: { id: string; score: number; max_score: number; started_at: string }[] }>("/api/v1/mcq/sessions?limit=10"),
    enabled: phase === "setup",
  });

  const startMutation = useMutation({
    mutationFn: () => api.post<{ test_session_id: string; questions: MCQQuestion[] }>("/api/v1/mcq/start", {
      exam_type: config.exam_type,
      mode: config.mode,
      difficulty: config.difficulty,
      question_count: config.question_count,
    }),
    onSuccess: (data) => {
      setSessionId(data.test_session_id);
      setQuestions(data.questions);
      setCurrentIdx(0);
      setSelected({});
      setPhase("test");
    },
    onError: () => toast.error("Failed to start test"),
  });

  const answerMutation = useMutation({
    mutationFn: ({ questionId, option }: { questionId: string; option: string }) =>
      api.post("/api/v1/mcq/answer", {
        test_session_id: sessionId,
        question_id: questionId,
        selected_option: option,
        time_spent_ms: 0,
      }),
  });

  const submitMutation = useMutation({
    mutationFn: () => api.post<{ score: number; max_score: number; accuracy: number; xp_earned: number }>("/api/v1/mcq/submit", { test_session_id: sessionId }),
    onSuccess: (data) => {
      setResult(data);
      setPhase("result");
      qc.invalidateQueries({ queryKey: ["test-sessions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Failed to submit test"),
  });

  function handleSelect(option: string) {
    const q = questions[currentIdx];
    if (selected[q.id]) return;
    setSelected((s) => ({ ...s, [q.id]: option }));
    answerMutation.mutate({ questionId: q.id, option });
  }

  if (phase === "setup") {
    return (
      <div className="p-8 max-w-2xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold">MCQ Tests</h1>
          <p className="text-sm text-muted-foreground">Practice with adaptive questions</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Start New Test</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Difficulty</label>
                <Select value={config.difficulty} onValueChange={(v) => setConfig((c) => ({ ...c, difficulty: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Questions</label>
                <Select
                  value={String(config.question_count)}
                  onValueChange={(v) => setConfig((c) => ({ ...c, question_count: Number(v) }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20, 30].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} questions</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
              {startMutation.isPending ? "Loading…" : "Start Test"}
            </Button>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-sm font-semibold mb-3">Past Sessions</h2>
          {sessLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 mb-2" />)
          ) : pastSessions?.sessions?.length ? (
            <div className="space-y-2">
              {pastSessions.sessions.map((s) => (
                <div key={s.id} className="flex items-center gap-4 rounded-lg border p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">Test Session</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.started_at).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <Badge variant={s.score / s.max_score >= 0.7 ? "default" : "secondary"}>
                    {Math.round((s.score / s.max_score) * 100)}%
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No tests taken yet.</p>
          )}
        </div>
      </div>
    );
  }

  if (phase === "test") {
    const q = questions[currentIdx];
    const answeredCount = Object.keys(selected).length;
    const pct = Math.round((answeredCount / questions.length) * 100);
    const isLast = currentIdx === questions.length - 1;
    const currentSelected = selected[q?.id];

    return (
      <div className="p-8 max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Question {currentIdx + 1} of {questions.length} &bull; {answeredCount} answered
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? "Submitting…" : "Submit Test"}
          </Button>
        </div>
        <Progress value={pct} />

        <Card>
          <CardContent className="pt-6 space-y-6">
            {q?.difficulty_level && (
              <Badge variant="outline">{q.difficulty_level}</Badge>
            )}
            <p className="text-base font-medium leading-relaxed">{q?.question_text}</p>
            <div className="space-y-2">
              {OPTIONS.map((opt) => {
                const text = q ? getOption(q, opt) : "";
                const isSelected = currentSelected === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => handleSelect(opt)}
                    disabled={!!currentSelected}
                    className={`w-full rounded-lg border p-4 text-left text-sm transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5 font-medium"
                        : "hover:bg-accent disabled:opacity-60"
                    }`}
                  >
                    <span className="font-semibold mr-2">{opt}.</span>
                    {text}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Prev
          </Button>
          <Button
            className="flex-1"
            onClick={() => isLast ? submitMutation.mutate() : setCurrentIdx((i) => i + 1)}
            disabled={submitMutation.isPending}
          >
            {isLast ? "Submit" : "Next"} <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "result" && result) {
    const pct = Math.round((result.score / result.max_score) * 100);
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
        <div className={`rounded-full p-6 mb-4 ${pct >= 70 ? "bg-green-100" : "bg-amber-100"}`}>
          <Trophy className={`h-12 w-12 ${pct >= 70 ? "text-green-600" : "text-amber-600"}`} />
        </div>
        <h2 className="text-3xl font-bold">{pct}%</h2>
        <p className="text-muted-foreground mt-1">
          {result.score} of {result.max_score} correct
        </p>
        <Progress value={pct} className="w-full mt-6 h-3" />
        <Button className="mt-8" onClick={() => { setPhase("setup"); setResult(null); setSessionId(null); setQuestions([]); setSelected({}); }}>
          Try Again
        </Button>
      </div>
    );
  }

  return null;
}
