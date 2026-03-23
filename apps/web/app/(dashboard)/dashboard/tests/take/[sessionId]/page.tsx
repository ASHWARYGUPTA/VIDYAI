"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import {
  AlertTriangle, Camera, CameraOff, Maximize, ChevronLeft,
  ChevronRight, Trophy, Eye, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// ── Types ────────────────────────────────────────────────────────────────────

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  difficulty_level?: string;
}

interface ProctorViolation {
  type: string;
  message: string;
  at: string;
}

const OPTIONS = ["A", "B", "C", "D"] as const;
function getOpt(q: Question, o: typeof OPTIONS[number]) {
  return { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d }[o];
}

// ── Proctoring hook ──────────────────────────────────────────────────────────

function useProctor(sessionId: string | null, enabled: boolean) {
  const [violations, setViolations] = useState<ProctorViolation[]>([]);
  const [camActive, setCamActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addViolation = useCallback((type: string, message: string) => {
    setViolations((v) => [...v, { type, message, at: new Date().toLocaleTimeString() }]);
    toast.warning(`⚠️ ${message}`, { duration: 3000 });
  }, []);

  const logEvent = useCallback(async (eventType: string) => {
    if (!sessionId) return;
    try {
      await api.post("/api/v1/tests/proctor/event", {
        test_session_id: sessionId,
        event_type: eventType,
      });
    } catch {}
  }, [sessionId]);

  // Start webcam — store stream and attach to video element whenever it's ready
  const startCam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false });
      streamRef.current = stream;
      // Attach immediately if the video element is already in the DOM
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCamActive(true);
    } catch {
      toast.error("Camera access denied — proctoring requires webcam");
    }
  }, []);

  const stopCam = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamActive(false);
  }, []);

  // Send frame to backend every 5 s
  const sendFrame = useCallback(async () => {
    if (!sessionId || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    const ctx = canvas.getContext("2d");
    if (!ctx || video.readyState < 2) return;
    ctx.drawImage(video, 0, 0);
    const b64 = canvas.toDataURL("image/jpeg", 0.6).split(",")[1];
    try {
      const res = await api.post<{ violations: string[]; face_count: number }>("/api/v1/tests/proctor/analyze", {
        test_session_id: sessionId,
        frame_b64: b64,
      });
      if (res.violations.includes("no_face")) {
        addViolation("no_face", "No face detected — please stay in frame");
      } else if (res.violations.includes("multiple_faces")) {
        addViolation("multiple_faces", "Multiple people detected!");
      } else if (res.violations.includes("looking_away")) {
        addViolation("looking_away", "Please look at the screen");
      }
    } catch {}
  }, [sessionId, addViolation]);

  // Browser-based event monitors
  useEffect(() => {
    if (!enabled || !sessionId) return;

    const onVisibilityChange = () => {
      if (document.hidden) {
        addViolation("tab_switch", "You switched tabs or minimised the window");
        logEvent("tab_switch");
      }
    };
    const onBlur = () => {
      addViolation("window_blur", "You left the test window");
      logEvent("window_blur");
    };
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        addViolation("fullscreen_exit", "You exited fullscreen mode");
        logEvent("fullscreen_exit");
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    // Context menu / right-click disabled
    const noCtx = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", noCtx);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("contextmenu", noCtx);
    };
  }, [enabled, sessionId, addViolation, logEvent]);

  // Start frame-sending loop once cam is active
  useEffect(() => {
    if (!enabled || !camActive || !sessionId) return;
    frameIntervalRef.current = setInterval(sendFrame, 5000);
    return () => {
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    };
  }, [enabled, camActive, sessionId, sendFrame]);

  // Re-attach stream when the video element mounts (e.g. after phase → "test")
  useEffect(() => {
    if (camActive && streamRef.current && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCam();
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    };
  }, [stopCam]);

  return { violations, camActive, videoRef, canvasRef, startCam, stopCam };
}

// ── Timer ────────────────────────────────────────────────────────────────────

function useCountdown(expiresAt: string | null) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const diff = Math.max(0, new Date(expiresAt).getTime() - Date.now());
      setRemaining(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (remaining === null) return "--:--";
  const m = Math.floor(remaining / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Setup screen ─────────────────────────────────────────────────────────────

function SetupScreen({
  title,
  questionCount,
  duration,
  onStart,
}: {
  title: string;
  questionCount: number;
  duration: number;
  onStart: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 space-y-6 text-center">
          <div className="rounded-full bg-primary/10 p-4 w-fit mx-auto">
            <Eye className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {questionCount} questions · {duration} minutes
            </p>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-left space-y-2">
            <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Proctoring Enabled
            </p>
            <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
              <li>Your webcam will be monitored throughout the test</li>
              <li>Do not switch tabs or minimize the window</li>
              <li>Stay in fullscreen mode</li>
              <li>Ensure no other person is visible on camera</li>
              <li>Violations are logged and reported</li>
            </ul>
          </div>
          <Button className="w-full" onClick={onStart}>
            <Camera className="h-4 w-4 mr-2" /> Allow Camera & Start Test
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main test-taking page ─────────────────────────────────────────────────────

export default function TakeTestPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  type Phase = "setup" | "loading" | "test" | "result";
  const [phase, setPhase] = useState<Phase>("setup");
  const [testData, setTestData] = useState<{
    title: string;
    questions: Question[];
    expires_at: string;
    duration_minutes: number;
  } | null>(null);
  // Metadata shown on the setup screen (loaded before camera starts)
  const [setupMeta, setSetupMeta] = useState<{ title: string; questionCount: number; duration: number } | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ score: number; max_score: number; accuracy: number } | null>(null);

  const { violations, camActive, videoRef, canvasRef, startCam, stopCam } = useProctor(
    phase === "test" ? sessionId : null,
    phase === "test",
  );

  const countdown = useCountdown(phase === "test" ? testData?.expires_at ?? null : null);

  // Load setup metadata (before camera) so the setup screen shows real info
  useEffect(() => {
    api.get<{
      session: { total_questions: number; duration_minutes: number; metadata: Record<string, string> };
      questions: Question[];
    }>(`/api/v1/mcq/session/${sessionId}`)
      .then((data) => {
        setSetupMeta({
          title: data.session.metadata?.title ?? data.session.metadata?.pdf_test_title ?? "Test",
          questionCount: data.session.total_questions,
          duration: data.session.duration_minutes,
        });
      })
      .catch(() => {
        setSetupMeta({ title: "Test", questionCount: 0, duration: 60 });
      });
  }, [sessionId]);

  // Load test session data (after camera starts)
  const loadSession = useCallback(async () => {
    setPhase("loading");
    try {
      const data = await api.get<{
        session: { total_questions: number; duration_minutes: number; metadata: Record<string, string> };
        questions: Question[];
      }>(`/api/v1/mcq/session/${sessionId}`);
      setTestData({
        title: data.session.metadata?.title ?? data.session.metadata?.pdf_test_title ?? "Test",
        questions: data.questions,
        expires_at: new Date(Date.now() + data.session.duration_minutes * 60000).toISOString(),
        duration_minutes: data.session.duration_minutes,
      });
      setPhase("test");
    } catch {
      toast.error("Failed to load test session");
      router.push("/dashboard/tests");
    }
  }, [sessionId, router]);

  async function handleStart() {
    await startCam();
    // Request fullscreen
    try {
      await document.documentElement.requestFullscreen();
    } catch {}
    await loadSession();
  }

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
    mutationFn: () =>
      api.post<{ score: number; max_score: number; accuracy: number }>("/api/v1/mcq/submit", {
        test_session_id: sessionId,
      }),
    onSuccess: (data) => {
      stopCam();
      document.exitFullscreen?.().catch(() => {});
      setResult(data);
      setPhase("result");
    },
    onError: () => toast.error("Submit failed — try again"),
  });

  function handleSelect(option: string) {
    const q = testData!.questions[currentIdx];
    if (selected[q.id]) return;
    setSelected((s) => ({ ...s, [q.id]: option }));
    answerMutation.mutate({ questionId: q.id, option });
  }

  // Auto-submit when timer hits zero
  useEffect(() => {
    if (countdown === "00:00" && phase === "test") {
      submitMutation.mutate();
    }
  }, [countdown, phase]); // eslint-disable-line

  // Hidden video+canvas always in DOM so videoRef/canvasRef are valid before phase="test"
  const hiddenMedia = (
    <>
      <video ref={videoRef} autoPlay muted playsInline className="hidden" />
      <canvas ref={canvasRef} className="hidden" />
    </>
  );

  // ── Setup screen ────────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <>
        {hiddenMedia}
        <SetupScreen
          title={setupMeta?.title ?? "Test"}
          questionCount={setupMeta?.questionCount ?? 0}
          duration={setupMeta?.duration ?? 60}
          onStart={handleStart}
        />
      </>
    );
  }

  if (phase === "loading") {
    return (
      <>
        {hiddenMedia}
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-3">
            <svg className="animate-spin h-8 w-8 text-primary mx-auto" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-sm text-muted-foreground">Loading test…</p>
          </div>
        </div>
      </>
    );
  }

  // ── Result screen ───────────────────────────────────────────────────────────
  if (phase === "result" && result) {
    const pct = Math.round((result.score / result.max_score) * 100);
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
        <div className={`rounded-full p-6 mb-4 ${pct >= 70 ? "bg-green-100" : "bg-amber-100"}`}>
          <Trophy className={`h-12 w-12 ${pct >= 70 ? "text-green-600" : "text-amber-600"}`} />
        </div>
        <h1 className="text-4xl font-bold">{pct}%</h1>
        <p className="text-muted-foreground mt-1">
          {result.score} / {result.max_score} marks
        </p>
        <Progress value={pct} className="w-64 mt-6 h-3" />

        {violations.length > 0 && (
          <div className="mt-6 w-full max-w-sm rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
            <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> {violations.length} Proctoring Violation{violations.length > 1 ? "s" : ""}
            </p>
            <ul className="text-xs text-amber-700 space-y-1">
              {violations.slice(0, 5).map((v, i) => (
                <li key={i}>{v.at} — {v.message}</li>
              ))}
            </ul>
          </div>
        )}

        <Button className="mt-8" onClick={() => router.push("/dashboard/tests")}>
          Back to Tests
        </Button>
      </div>
    );
  }

  // ── Test screen ─────────────────────────────────────────────────────────────
  if (phase === "test" && testData) {
    const questions = testData.questions;
    const q = questions[currentIdx];
    const answeredCount = Object.keys(selected).length;
    const pct = Math.round((answeredCount / questions.length) * 100);
    const isLast = currentIdx === questions.length - 1;
    const timerRed = countdown !== "--:--" && parseInt(countdown.split(":")[0]) < 5;

    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 backdrop-blur px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium truncate max-w-48">{testData.title}</span>
            <Badge variant="outline" className="text-xs">
              {answeredCount}/{questions.length} answered
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            {/* Violation count */}
            {violations.length > 0 && (
              <Badge variant="destructive" className="gap-1 text-xs">
                <AlertTriangle className="h-3 w-3" /> {violations.length} violation{violations.length > 1 ? "s" : ""}
              </Badge>
            )}
            {/* Timer */}
            <span className={`font-mono text-sm font-semibold tabular-nums ${timerRed ? "text-red-600" : ""}`}>
              {countdown}
            </span>
            {/* Cam indicator */}
            <span className={`flex items-center gap-1 text-xs ${camActive ? "text-green-600" : "text-red-500"}`}>
              {camActive ? <Camera className="h-3.5 w-3.5" /> : <CameraOff className="h-3.5 w-3.5" />}
              {camActive ? "Live" : "Off"}
            </span>
            {/* Fullscreen */}
            <button
              onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
              className="text-muted-foreground hover:text-foreground"
              title="Enter fullscreen"
            >
              <Maximize className="h-4 w-4" />
            </button>
            <Button size="sm" variant="destructive" onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
              Submit
            </Button>
          </div>
        </div>

        <Progress value={pct} className="h-1 rounded-none" />

        <div className="flex flex-1 gap-0">
          {/* Question panel */}
          <div className="flex-1 p-6 max-w-2xl mx-auto w-full space-y-5">
            <p className="text-xs text-muted-foreground">Question {currentIdx + 1} of {questions.length}</p>
            {q?.difficulty_level && <Badge variant="outline">{q.difficulty_level}</Badge>}

            <p className="text-base font-medium leading-relaxed whitespace-pre-wrap">{q?.question_text}</p>

            <div className="space-y-2.5">
              {OPTIONS.map((opt) => {
                const text = q ? getOpt(q, opt) : "";
                const isSelected = selected[q?.id] === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => handleSelect(opt)}
                    disabled={!!selected[q?.id]}
                    className={`w-full rounded-xl border p-4 text-left text-sm transition-all ${
                      isSelected
                        ? "border-primary bg-primary/8 font-medium shadow-sm"
                        : "hover:bg-accent disabled:opacity-50"
                    }`}
                  >
                    <span className="font-semibold mr-2">{opt}.</span> {text}
                    {isSelected && <CheckCircle2 className="inline h-4 w-4 ml-2 text-primary" />}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((i) => i - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
              <Button
                className="flex-1"
                onClick={() => isLast ? submitMutation.mutate() : setCurrentIdx((i) => i + 1)}
                disabled={submitMutation.isPending}
              >
                {isLast ? "Submit Test" : "Next"} <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>

          {/* Proctoring sidebar */}
          <div className="w-56 border-l p-4 space-y-4 hidden lg:block">
            {/* Webcam preview — mirrors the always-mounted hidden video via object-fit */}
            <div className="rounded-lg overflow-hidden bg-black aspect-video relative">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              {!camActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <CameraOff className="h-6 w-6 text-white/60" />
                </div>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />

            {/* Recent violations */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Proctoring Log
              </p>
              {violations.length === 0 ? (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> No violations
                </p>
              ) : (
                <ul className="space-y-1 max-h-64 overflow-y-auto">
                  {[...violations].reverse().slice(0, 10).map((v, i) => (
                    <li key={i} className="text-xs text-amber-700 flex gap-1.5">
                      <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>{v.message} <span className="text-muted-foreground">({v.at})</span></span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Question navigator */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Questions
              </p>
              <div className="grid grid-cols-5 gap-1">
                {questions.map((q, i) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(i)}
                    className={`rounded text-xs py-1 font-medium transition-colors ${
                      i === currentIdx
                        ? "bg-primary text-primary-foreground"
                        : selected[q.id]
                        ? "bg-green-100 text-green-700"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
