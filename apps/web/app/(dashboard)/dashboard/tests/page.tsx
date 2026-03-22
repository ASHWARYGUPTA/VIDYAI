"use client";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Upload, FileText, Play, Clock, BookOpen, Trophy, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Upload panel ─────────────────────────────────────────────────────────────

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
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <Upload className="h-8 w-8 text-muted-foreground" />
        {file ? (
          <div className="text-center">
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm font-medium">Drop your question paper PDF here</p>
            <p className="text-xs text-muted-foreground">or click to browse</p>
          </div>
        )}
      </div>

      {/* Title */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Test Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Physics Mock Test 1"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Duration */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Duration (minutes)</label>
        <Select value={duration} onValueChange={setDuration}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {[30, 45, 60, 90, 120, 180].map((m) => (
              <SelectItem key={m} value={String(m)}>{m} min</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        className="w-full"
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

// ── Main page ─────────────────────────────────────────────────────────────────

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
    <div className="p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Tests</h1>
        <p className="text-sm text-muted-foreground">Upload question papers or practice MCQs — with AI proctoring</p>
      </div>

      <Tabs defaultValue="my-tests">
        <TabsList>
          <TabsTrigger value="my-tests">My Tests</TabsTrigger>
          <TabsTrigger value="upload">Upload PDF</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* My Tests */}
        <TabsContent value="my-tests" className="mt-4 space-y-3">
          {testsLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)
          ) : testsData?.tests?.length ? (
            testsData.tests.map((t) => (
              <Card key={t.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="rounded-lg bg-primary/10 p-2.5">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                      <span>{t.total_questions} questions</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{t.duration_minutes} min</span>
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => startMutation.mutate(t.id)}
                    disabled={startMutation.isPending}
                    className="gap-1"
                  >
                    <Play className="h-3.5 w-3.5" /> Start
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No tests yet. Upload a question paper PDF to get started.</p>
            </div>
          )}
        </TabsContent>

        {/* Upload */}
        <TabsContent value="upload" className="mt-4">
          <UploadPanel onUploaded={() => qc.invalidateQueries({ queryKey: ["pdf-tests"] })} />
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="mt-4 space-y-3">
          {sessLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)
          ) : sessionsData?.sessions?.length ? (
            sessionsData.sessions.map((s) => {
              const pct = s.max_score > 0 ? Math.round((s.score / s.max_score) * 100) : 0;
              return (
                <div key={s.id} className="flex items-center gap-4 rounded-lg border p-3">
                  <div className={`rounded-full p-2 ${pct >= 70 ? "bg-green-100" : "bg-amber-100"}`}>
                    <Trophy className={`h-4 w-4 ${pct >= 70 ? "text-green-600" : "text-amber-600"}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{s.exam_type} Test</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.started_at).toLocaleDateString("en-IN")} · {s.total_questions} questions
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={pct >= 70 ? "default" : "secondary"}>{pct}%</Badge>
                    {!s.submitted_at && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-2"
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
            <p className="text-sm text-muted-foreground text-center py-8">No test history yet.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
