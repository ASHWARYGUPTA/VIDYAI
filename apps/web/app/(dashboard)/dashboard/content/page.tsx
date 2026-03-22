"use client";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Youtube, Loader2, ExternalLink, Trash2, CheckCircle, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { contentApi } from "@/lib/api/endpoints";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Shared Markdown + Mermaid renderer
import { NoteRenderer } from "@/components/markdown-renderer";

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline" size="sm"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
    >
      {copied ? <><Check className="h-3 w-3 mr-1" />Copied</> : <><Copy className="h-3 w-3 mr-1" />Copy MD</>}
    </Button>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Queued", variant: "outline" },
  processing: { label: "Processing", variant: "secondary" },
  completed: { label: "Done", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
};

interface ProcessedVideo {
  id: string;
  youtube_url: string;
  title?: string;
  processing_status: string;
  error_message?: string;
  summary?: string;
  key_concepts?: string[];
  structured_notes?: string | { heading: string; content: string }[];
  created_at: string;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ContentPage() {
  const qc = useQueryClient();
  const [url, setUrl] = useState("");
  const [selected, setSelected] = useState<ProcessedVideo | null>(null);
  const prevStatuses = useRef<Record<string, string>>({});

  const { data: videos, isLoading } = useQuery({
    queryKey: ["videos"],
    queryFn: () => contentApi.list({ limit: 20 }),
    refetchInterval: (data) => {
      const hasProcessing = (data?.state?.data as { videos?: ProcessedVideo[] })?.videos?.some(
        (v: ProcessedVideo) => v.processing_status === "processing" || v.processing_status === "pending"
      );
      return hasProcessing ? 5000 : false;
    },
  });

  useEffect(() => {
    const list = videos?.videos ?? [];
    list.forEach((v: ProcessedVideo) => {
      const prev = prevStatuses.current[v.id];
      if (prev && prev !== "failed" && v.processing_status === "failed") {
        if (v.error_message === "NO_TRANSCRIPT") {
          toast.error("No transcript available. Try a video with captions enabled.");
        } else {
          toast.error("Video processing failed. Please try again.");
        }
      }
      prevStatuses.current[v.id] = v.processing_status;
    });
  }, [videos]);

  const processMutation = useMutation({
    mutationFn: (youtubeUrl: string) => contentApi.process({ youtube_url: youtubeUrl }),
    onSuccess: () => {
      toast.success("Video added to processing queue");
      setUrl("");
      qc.invalidateQueries({ queryKey: ["videos"] });
    },
    onError: (err: { status?: number }) => {
      if (err.status === 429) toast.error("Daily limit reached. Upgrade to Pro for more.");
      else toast.error("Failed to process video");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contentApi.delete(id),
    onSuccess: () => {
      toast.success("Video deleted");
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["videos"] });
    },
  });

  const isYouTube = (u: string) => /youtube\.com|youtu\.be/.test(u);

  // Normalise notes to a Markdown string
  const notesMarkdown = (v: ProcessedVideo): string => {
    if (!v.structured_notes) return "";
    if (typeof v.structured_notes === "string") return v.structured_notes;
    // Legacy array format
    return v.structured_notes.map((n) => `## ${n.heading}\n${n.content}`).join("\n\n");
  };

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Content Processor</h1>
        <p className="text-sm text-muted-foreground">Turn YouTube lectures into visual study notes</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
              <Input
                className="pl-9"
                placeholder="Paste YouTube URL…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && isYouTube(url) && processMutation.mutate(url)}
              />
            </div>
            <Button
              onClick={() => processMutation.mutate(url)}
              disabled={!isYouTube(url) || processMutation.isPending}
            >
              {processMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Process"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Free plan: 5 videos/day</p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)
        ) : videos?.videos?.length ? (
          videos.videos.map((v: ProcessedVideo) => {
            const { label, variant } = STATUS_BADGE[v.processing_status] ?? { label: v.processing_status, variant: "outline" as const };
            return (
              <Card
                key={v.id}
                className={`transition-colors ${v.processing_status === "completed" ? "cursor-pointer hover:border-primary/50" : ""}`}
                onClick={() => v.processing_status === "completed" && setSelected(v)}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-red-100 p-2 shrink-0">
                      {v.processing_status === "processing" ? (
                        <Loader2 className="h-4 w-4 text-red-500 animate-spin" />
                      ) : v.processing_status === "completed" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Youtube className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{v.title ?? "Processing…"}</p>
                      <p className="text-xs text-muted-foreground truncate">{v.youtube_url}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={variant}>{label}</Badge>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(v.id); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Youtube className="mx-auto h-10 w-10 opacity-30 mb-3" />
            <p>No videos processed yet. Paste a YouTube URL above.</p>
          </div>
        )}
      </div>

      {/* ── Notes viewer ── */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
            <DialogTitle className="line-clamp-2 text-base">{selected?.title}</DialogTitle>
            {selected?.summary && (
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">{selected.summary}</p>
            )}
            {selected?.key_concepts?.length ? (
              <div className="flex flex-wrap gap-1 mt-2">
                {selected.key_concepts.map((c) => (
                  <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                ))}
              </div>
            ) : null}
          </DialogHeader>

          {selected && (
            <Tabs defaultValue="notes" className="flex flex-col flex-1 min-h-0">
              <div className="px-6 pt-3 pb-0 shrink-0 flex items-center justify-between">
                <TabsList className="h-8">
                  <TabsTrigger value="notes" className="text-xs">Visual Notes</TabsTrigger>
                  <TabsTrigger value="raw" className="text-xs">Markdown</TabsTrigger>
                </TabsList>
                <div className="flex gap-2">
                  <CopyButton text={notesMarkdown(selected)} />
                  <Button variant="outline" size="sm" asChild>
                    <a href={selected.youtube_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />Watch
                    </a>
                  </Button>
                </div>
              </div>

              <TabsContent value="notes" className="flex-1 overflow-y-auto px-6 pb-6 mt-3">
                <NoteRenderer markdown={notesMarkdown(selected)} />
              </TabsContent>

              <TabsContent value="raw" className="flex-1 overflow-y-auto px-6 pb-6 mt-3">
                <pre className="text-xs font-mono bg-muted p-4 rounded-lg whitespace-pre-wrap leading-relaxed">
                  {notesMarkdown(selected)}
                </pre>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
