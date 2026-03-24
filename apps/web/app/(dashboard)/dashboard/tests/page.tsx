"use client";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Upload, FileText, Play, Clock, BookOpen, Trophy, ChevronRight, Zap, Camera, Shield, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PdfTest {
  id: string;
  title: string;
  source_filename: string;
  total_questions: number;
  duration_minutes: number;
  created_at: string;
}

interface TestSession {
  id: string;
  exam_type: string;
  started_at: string;
  submitted_at: string | null;
  score: number;
  max_score: number;
  total_questions: number;
}

function UploadPanel({ onUploaded }: { onUploaded: () => void }) {
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("60");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file || !title.trim()) throw new Error("Missing fields");
      const form = new FormData();
      form.append("file", file);
      form.append("title", title.trim());
      form.append("duration_minutes", duration);
      const { createClient } = await import("@/lib/supabase/client");
      const { data: { session } } = await createClient().auth.getSession();
      const token = session?.access_token ?? "";
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/tests/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.detail?.code || "Upload failed");
      }
      return resp.json();
    },
    onSuccess: (data) => {
      toast.success(`Test created — ${data.total_questions} questions extracted`);
      setFile(null);
      setTitle("");
      onUploaded();
    },
    onError: (e: Error) => {
      const msg = e.message === "NO_MCQ"
        ? "No MCQs found in this PDF. Ensure it contains multiple-choice questions."
        : e.message === "INVALID_FILE"
        ? "Please upload a PDF file."
        : "Upload failed. Try again.";
      toast.error(msg);
    },
  });

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") setFile(f);
    else toast.error("Please drop a PDF file");
  }

  return (
    <div className="space-y-5 max-w-lg">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 cursor-pointer transition-all ${
          dragging ? "border-blue-500 bg-blue-50/50 shadow-lg shadow-blue-500/10" : "border-blue-200 hover:border-blue-400 hover:bg-blue-50/30"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <div className="rounded-xl bg-blue-50 p-3">
          <Upload className="h-8 w-8 text-blue-500" />
        </div>
        {file ? (
          <div className="text-center">
            <p className="text-sm font-medium text-gray-800">{file.name}</p>
            <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm font-medium text-gray-800">Drop your question paper PDF here</p>
            <p className="text-xs text-gray-400">or click to browse</p>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-800">Test Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Physics Mock Test 1"
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-800">Duration (minutes)</label>
        <Select value={duration} onValueChange={setDuration}>
          <SelectTrigger className="border-gray-200"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[30, 45, 60, 90, 120, 180].map((m) => (
              <SelectItem key={m} value={String(m)}>{m} min</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg shadow-blue-500/20"
        onClick={() => uploadMutation.mutate()}
        disabled={!file || !title.trim() || uploadMutation.isPending}
      >
        {uploadMutation.isPending ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Extracting questions…
          </span>
        ) : (
          <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> Upload & Create Test</span>
        )}
      </Button>
    </div>
  );
}

function QuickJeePanel() {
  const router = useRouter();

  const quickMutation = useMutation({
    mutationFn: () => api.post<{ test_session_id: string }>("/api/v1/tests/quick-jee", {}),
    onSuccess: (data) => {
      router.push(`/dashboard/tests/take/${data.test_session_id}`);
    },
    onError: () => toast.error("Failed to start quick test — try again"),
  });

  const topics = [
    { icon: "⚡", label: "Kinematics & Newton's Laws", color: "bg-blue-50 text-blue-700 border-blue-100" },
    { icon: "⚛️", label: "Electrostatics", color: "bg-purple-50 text-purple-700 border-purple-100" },
    { icon: "🧪", label: "Periodic Table & Bonding", color: "bg-green-50 text-green-700 border-green-100" },
    { icon: "⚖️", label: "Chemical Equilibrium", color: "bg-teal-50 text-teal-700 border-teal-100" },
    { icon: "📐", label: "Quadratics & Integration", color: "bg-orange-50 text-orange-700 border-orange-100" },
    { icon: "🎲", label: "Probability & Trigonometry", color: "bg-rose-50 text-rose-700 border-rose-100" },
  ];

  return (
    <div className="space-y-6 max-w-xl">
      {/* Hero card */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 p-2.5 shadow-lg shadow-blue-500/20">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">JEE Quick Practice Test</h2>
            <p className="text-xs text-gray-500">10 questions · 15 minutes · AI proctoring</p>
          </div>
        </div>

        <p className="text-sm text-gray-600">
          Jump straight into a proctored JEE mock covering Physics, Chemistry, and Mathematics.
          No setup needed — just click and start.
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2">
          {[
            { icon: Camera, label: "Webcam monitored", color: "text-blue-600 bg-blue-50 border-blue-100" },
            { icon: Shield, label: "Violations logged", color: "text-amber-700 bg-amber-50 border-amber-100" },
            { icon: FlaskConical, label: "Negative marking", color: "text-green-700 bg-green-50 border-green-100" },
          ].map(({ icon: Icon, label, color }) => (
            <span key={label} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${color}`}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </span>
          ))}
        </div>

        <Button
          className="w-full bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
          onClick={() => quickMutation.mutate()}
          disabled={quickMutation.isPending}
        >
          {quickMutation.isPending ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Creating test…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Play className="h-4 w-4" /> Start 10-Question JEE Test
            </span>
          )}
        </Button>
      </div>

      {/* Topics covered */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Topics Covered</p>
        <div className="grid grid-cols-2 gap-2">
          {topics.map((t) => (
            <div key={t.label} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium ${t.color}`}>
              <span>{t.icon}</span> {t.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


export default function TestsPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: testsData, isLoading: testsLoading } = useQuery({
    queryKey: ["pdf-tests"],
    queryFn: () => api.get<{ tests: PdfTest[] }>("/api/v1/tests/"),
  });

  const { data: sessionsData, isLoading: sessLoading } = useQuery({
    queryKey: ["test-sessions"],
    queryFn: () => api.get<{ sessions: TestSession[] }>("/api/v1/mcq/sessions?limit=10"),
  });

  const startMutation = useMutation({
    mutationFn: (testId: string) =>
      api.post<{ test_session_id: string }>(`/api/v1/tests/${testId}/start`, {}),
    onSuccess: (data) => {
      router.push(`/dashboard/tests/take/${data.test_session_id}`);
    },
    onError: () => toast.error("Failed to start test"),
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-2.5 shadow-lg shadow-blue-500/20">
          <FileText className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Tests</h1>
          <p className="text-sm text-gray-500">Upload question papers or practice MCQs — with AI proctoring</p>
        </div>
      </div>

      <Tabs defaultValue="quick">
        <TabsList className="bg-white border border-blue-100/60">
          <TabsTrigger value="quick">⚡ Quick JEE Test</TabsTrigger>
          <TabsTrigger value="my-tests">My Tests</TabsTrigger>
          <TabsTrigger value="upload">Upload PDF</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="quick" className="mt-4">
          <QuickJeePanel />
        </TabsContent>

        <TabsContent value="my-tests" className="mt-4 space-y-3">
          {testsLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          ) : testsData?.tests?.length ? (
            testsData.tests.map((t) => (
              <Card key={t.id} className="border-blue-100/50 bg-white card-hover">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="rounded-xl bg-blue-50 p-2.5">
                    <BookOpen className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-gray-800">{t.title}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-3 mt-0.5">
                      <span>{t.total_questions} questions</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{t.duration_minutes} min</span>
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => startMutation.mutate(t.id)}
                    disabled={startMutation.isPending}
                    className="gap-1 bg-gradient-to-r from-blue-600 to-blue-500 shadow-md shadow-blue-500/20"
                  >
                    <Play className="h-3.5 w-3.5" /> Start
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="rounded-2xl bg-blue-50 p-5 w-fit mx-auto mb-3">
                <FileText className="h-10 w-10 text-blue-400" />
              </div>
              <p className="text-sm text-gray-400">No tests yet. Upload a question paper PDF to get started.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="upload" className="mt-4">
          <UploadPanel onUploaded={() => qc.invalidateQueries({ queryKey: ["pdf-tests"] })} />
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-3">
          {sessLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
          ) : sessionsData?.sessions?.length ? (
            sessionsData.sessions.map((s) => {
              const pct = s.max_score > 0 ? Math.round((s.score / s.max_score) * 100) : 0;
              return (
                <div key={s.id} className="flex items-center gap-4 rounded-xl border border-gray-200 p-3 hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                  <div className={`rounded-xl p-2 ${pct >= 70 ? "bg-green-50" : "bg-amber-50"}`}>
                    <Trophy className={`h-4 w-4 ${pct >= 70 ? "text-green-600" : "text-amber-600"}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{s.exam_type} Test</p>
                    <p className="text-xs text-gray-400">
                      {new Date(s.started_at).toLocaleDateString("en-IN")} · {s.total_questions} questions
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={pct >= 70 ? "default" : "secondary"} className={pct >= 70 ? "bg-green-500" : ""}>{pct}%</Badge>
                    {!s.submitted_at && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-2 text-blue-600"
                        onClick={() => router.push(`/dashboard/tests/take/${s.id}`)}
                      >
                        Resume <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No test history yet.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
