"use client";
import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload, FileText, Trash2, Search, BookOpen, RefreshCw,
  CheckCircle2, Clock, AlertCircle, Loader2, X, ChevronDown,
  TreePine, Layers,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

// ── Types ──────────────────────────────────────────────────────────────────────
interface KnowledgeDoc {
  id: string;
  title: string;
  exam_types: string[];
  subject: string | null;
  document_type: string;
  year: number | null;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  page_count: number | null;
  processing_status: "pending" | "processing" | "completed" | "failed";
  chunk_count: number;
  created_at: string;
  error_message: string | null;
}

interface Stats {
  total_documents: number;
  completed: number;
  indexed: number;
  processing: number;
  failed: number;
  pending: number;
  total_tree_nodes: number;
  total_pages: number;
  total_bytes: number;
  by_document_type: Record<string, number>;
  by_exam_type: Record<string, number>;
}

interface SearchResult {
  doc_id: string;
  doc_title: string;
  node_id: string;
  title: string;
  summary: string;
  page_range: string;
  page_number: number;
  section_heading: string;
  subject: string;
  document_type: string;
  content: string;
  relevance: string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err.error ?? "Request failed"), { status: res.status });
  }
  return res.json();
}

// ── Constants ──────────────────────────────────────────────────────────────────
const EXAM_OPTIONS = ["JEE", "NEET", "UPSC"] as const;
const DOC_TYPES = [
  { value: "ncert",          label: "NCERT Textbook" },
  { value: "pyq",            label: "Past Year Questions" },
  { value: "reference_book", label: "Reference Book" },
  { value: "notes",          label: "Study Notes" },
  { value: "syllabus",       label: "Syllabus / Rules" },
  { value: "other",          label: "Other" },
] as const;

const STATUS_CONFIG = {
  pending:    { label: "Queued",     icon: Clock,         color: "text-amber-500 bg-amber-50" },
  processing: { label: "Indexing",   icon: Loader2,       color: "text-blue-500 bg-blue-50" },
  completed:  { label: "Indexed",    icon: CheckCircle2,  color: "text-green-500 bg-green-50" },
  failed:     { label: "Failed",     icon: AlertCircle,   color: "text-red-500 bg-red-50" },
};

// ── Upload Form ────────────────────────────────────────────────────────────────
function UploadForm({ onSuccess }: { onSuccess: () => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [examTypes, setExamTypes] = useState<string[]>(["JEE"]);
  const [form, setForm] = useState({
    title: "", description: "", subject: "",
    document_type: "ncert", year: "", class_level: "",
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", form.title || file.name.replace(/\.[^.]+$/, ""));
      fd.append("description", form.description);
      fd.append("exam_types", JSON.stringify(examTypes));
      fd.append("subject", form.subject);
      fd.append("document_type", form.document_type);
      if (form.year) fd.append("year", form.year);
      if (form.class_level) fd.append("class_level", form.class_level);
      return apiFetch("/api/v1/knowledge/upload", { method: "POST", body: fd });
    },
    onSuccess: () => {
      toast.success("Uploaded — PageIndex processing running in background");
      setFile(null);
      setForm({ title: "", description: "", subject: "", document_type: "ncert", year: "", class_level: "" });
      setExamTypes(["JEE"]);
      onSuccess();
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Upload failed"),
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }, []);

  function toggleExam(exam: string) {
    setExamTypes((prev) =>
      prev.includes(exam) ? prev.filter((e) => e !== exam) : [...prev, exam]
    );
  }

  const isPYQ = form.document_type === "pyq";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="h-4 w-4" /> Upload Document
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Drag-drop zone */}
        <div
          className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer
            ${dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
          />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div className="text-left">
                <p className="font-medium text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
              <button
                className="ml-2 text-muted-foreground hover:text-foreground"
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">Drop PDF or image here</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, WEBP — max 50 MB</p>
            </>
          )}
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label>Title</Label>
            <Input
              placeholder="e.g. NCERT Physics Class 11 Chapter 3"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Document Type</Label>
            <Select value={form.document_type} onValueChange={(v) => setForm((f) => ({ ...f, document_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Subject <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              placeholder="Physics, Chemistry, Polity…"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            />
          </div>

          {isPYQ && (
            <div className="space-y-1.5">
              <Label>Year</Label>
              <Input
                type="number" placeholder="2023" min={1990} max={2030}
                value={form.year}
                onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Class Level <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Select
              value={form.class_level || "__none"}
              onValueChange={(v) => setForm((f) => ({ ...f, class_level: v === "__none" ? "" : v }))}
            >
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Any</SelectItem>
                <SelectItem value="11">Class 11</SelectItem>
                <SelectItem value="12">Class 12</SelectItem>
                <SelectItem value="dropper">Dropper</SelectItem>
                <SelectItem value="graduate">Graduate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Exam type checkboxes */}
        <div className="space-y-1.5">
          <Label>Exam Types</Label>
          <div className="flex gap-2">
            {EXAM_OPTIONS.map((exam) => (
              <button
                key={exam}
                type="button"
                onClick={() => toggleExam(exam)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors
                  ${examTypes.includes(exam)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-accent"
                  }`}
              >
                {exam}
              </button>
            ))}
          </div>
        </div>

        <Button
          className="w-full"
          onClick={() => uploadMutation.mutate()}
          disabled={!file || examTypes.length === 0 || uploadMutation.isPending}
        >
          {uploadMutation.isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…</>
          ) : (
            <><Upload className="h-4 w-4 mr-2" /> Upload & Index</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Stats Bar ──────────────────────────────────────────────────────────────────
function StatsBar({ stats }: { stats: Stats }) {
  const pct = stats.total_documents
    ? Math.round((stats.completed / stats.total_documents) * 100)
    : 0;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { label: "Total Docs",      value: stats.total_documents },
        { label: "Indexed",          value: stats.indexed, color: "text-green-600" },
        { label: "Total Pages",      value: stats.total_pages.toLocaleString() },
        { label: "Storage",          value: `${(stats.total_bytes / 1024 / 1024).toFixed(1)} MB` },
      ].map(({ label, value, color }) => (
        <Card key={label}>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${color ?? ""}`}>{value}</p>
          </CardContent>
        </Card>
      ))}
      {stats.total_documents > 0 && (
        <div className="col-span-2 md:col-span-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Indexing progress</span>
            <span>{pct}% complete</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>
      )}
    </div>
  );
}

// ── Document Row ───────────────────────────────────────────────────────────────
function DocRow({ doc, onDelete, onReprocess }: {
  doc: KnowledgeDoc;
  onDelete: (id: string) => void;
  onReprocess: (id: string) => void;
}) {
  const noTree = doc.processing_status === "completed" && doc.chunk_count === 0;
  const cfg = noTree
    ? { label: "No Index", icon: AlertCircle, color: "text-orange-500 bg-orange-50" }
    : STATUS_CONFIG[doc.processing_status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  const docTypeLabel = DOC_TYPES.find((d) => d.value === doc.document_type)?.label ?? doc.document_type;

  return (
    <div className="flex items-start gap-4 rounded-lg border p-4 hover:bg-accent/30 transition-colors">
      <div className={`rounded-md p-2 shrink-0 ${cfg.color}`}>
        <Icon className={`h-4 w-4 ${doc.processing_status === "processing" ? "animate-spin" : ""}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <p className="text-sm font-medium truncate flex-1">{doc.title}</p>
          <Badge variant="outline" className={`text-xs shrink-0 ${cfg.color}`}>{cfg.label}</Badge>
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {doc.exam_types.map((e) => (
            <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>
          ))}
          <span className="text-xs text-muted-foreground">{docTypeLabel}</span>
          {doc.subject && <span className="text-xs text-muted-foreground">· {doc.subject}</span>}
          {doc.year && <span className="text-xs text-muted-foreground">· {doc.year}</span>}
          {doc.page_count && <span className="text-xs text-muted-foreground">· {doc.page_count} pages</span>}
          {doc.chunk_count > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              · <TreePine className="h-3 w-3" /> {doc.chunk_count} nodes
            </span>
          )}
        </div>
        {doc.error_message && (
          <p className="text-xs text-red-500 mt-1 truncate">{doc.error_message}</p>
        )}
        {noTree && (
          <p className="text-xs text-orange-500 mt-1">PageIndex failed — check API key then reprocess</p>
        )}
      </div>

      <div className="flex gap-1 shrink-0">
        {(noTree || doc.processing_status === "failed") && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-blue-600"
            title="Reprocess"
            onClick={() => onReprocess(doc.id)}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(doc.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Debug Panel ───────────────────────────────────────────────────────────────
function DebugPanel() {
  const [open, setOpen] = useState(false);
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["kb-debug"],
    queryFn: () => apiFetch<Record<string, unknown>>("/api/v1/knowledge/debug"),
    enabled: open,
    staleTime: 0,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <button
          className="flex items-center gap-2 text-base font-semibold text-left"
          onClick={() => { setOpen((o) => !o); if (!open) refetch(); }}
        >
          <AlertCircle className="h-4 w-4 text-amber-500" />
          PageIndex Diagnostics
          <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-3">
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-2" />}
            Run Diagnostics
          </Button>
          {data && (
            <div className="rounded-md bg-muted p-3 text-xs font-mono space-y-1 leading-relaxed">
              {Object.entries(data).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-muted-foreground shrink-0">{k}:</span>
                  <span className={
                    v === true ? "text-green-600" :
                    v === false ? "text-red-500" :
                    typeof v === "number" && v > 0 ? "text-blue-600" : ""
                  }>
                    {JSON.stringify(v)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ── Search Panel ───────────────────────────────────────────────────────────────
function SearchPanel() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["kb-search", submitted],
    queryFn: () =>
      apiFetch<{ results: SearchResult[] }>
        (`/api/v1/knowledge/search?q=${encodeURIComponent(submitted)}&limit=5`),
    enabled: submitted.length >= 3,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Search className="h-4 w-4" /> Test PageIndex Search
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Ask a question to test retrieval…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && query.length >= 3 && setSubmitted(query)}
          />
          <Button
            variant="outline"
            onClick={() => setSubmitted(query)}
            disabled={query.length < 3 || isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {data?.results?.length ? (
          <div className="space-y-3">
            {data.results.map((r, i) => (
              <div key={i} className="rounded-md border p-3 text-sm space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-xs truncate">
                    {r.doc_title}{r.section_heading ? ` › ${r.section_heading}` : ""}
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="outline" className="text-xs">
                      pp. {r.page_range}
                    </Badge>
                    <Badge
                      variant={r.relevance === "high" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {r.relevance}
                    </Badge>
                  </div>
                </div>
                {r.summary && (
                  <p className="text-xs text-blue-600 italic">{r.summary}</p>
                )}
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{r.content}</p>
              </div>
            ))}
          </div>
        ) : submitted && !isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No matches found. Upload relevant documents first.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function KnowledgePage() {
  const qc = useQueryClient();
  const [filterType, setFilterType] = useState<string>("all");
  const [filterExam, setFilterExam] = useState<string>("all");

  const { data: stats } = useQuery({
    queryKey: ["kb-stats"],
    queryFn: () => apiFetch<Stats>("/api/v1/knowledge/stats"),
    refetchInterval: 10_000,
  });

  const { data: docs, isLoading } = useQuery({
    queryKey: ["kb-docs", filterType, filterExam],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "50" });
      if (filterType !== "all") params.set("document_type", filterType);
      return apiFetch<{ documents: KnowledgeDoc[]; total: number }>(
        `/api/v1/knowledge/documents?${params}`
      );
    },
    refetchInterval: (data) => {
      const hasActive = (data?.state?.data as { documents?: KnowledgeDoc[] })
        ?.documents?.some((d) => d.processing_status === "processing" || d.processing_status === "pending");
      return hasActive ? 5_000 : 15_000;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/v1/knowledge/documents/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Document deleted");
      qc.invalidateQueries({ queryKey: ["kb-docs"] });
      qc.invalidateQueries({ queryKey: ["kb-stats"] });
    },
    onError: () => toast.error("Delete failed"),
  });

  const reprocessMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/v1/knowledge/documents/${id}/reprocess`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Re-indexing started");
      qc.invalidateQueries({ queryKey: ["kb-docs"] });
    },
    onError: () => toast.error("Reprocess failed — check backend logs"),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["kb-docs"] });
    qc.invalidateQueries({ queryKey: ["kb-stats"] });
  };

  // Client-side exam filter
  const filtered = (docs?.documents ?? []).filter((d) =>
    filterExam === "all" ? true : d.exam_types.includes(filterExam)
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6" /> Knowledge Base
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload NCERT books, PYQs, reference materials — documents are indexed with PageIndex for intelligent tree-based retrieval.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="h-3.5 w-3.5 mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      {stats && <StatsBar stats={stats} />}

      {/* Two-column layout: upload + list */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Upload form — narrower column */}
        <div className="lg:col-span-2 space-y-6">
          <UploadForm onSuccess={refresh} />
          <SearchPanel />
          <DebugPanel />
        </div>

        {/* Document list — wider column */}
        <div className="lg:col-span-3 space-y-4">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <Select value={filterExam} onValueChange={setFilterExam}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="All Exams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exams</SelectItem>
                {EXAM_OPTIONS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-44 h-8 text-xs">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {DOC_TYPES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground self-center ml-auto">
              {filtered.length} document{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* List */}
          <div className="space-y-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)
            ) : filtered.length ? (
              filtered.map((doc) => (
                <DocRow
                  key={doc.id}
                  doc={doc}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onReprocess={(id) => reprocessMutation.mutate(id)}
                />
              ))
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <BookOpen className="mx-auto h-10 w-10 opacity-20 mb-3" />
                <p className="text-sm">No documents yet.</p>
                <p className="text-xs mt-1">Upload a PDF or image to get started.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
