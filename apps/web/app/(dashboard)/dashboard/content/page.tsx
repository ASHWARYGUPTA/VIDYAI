"use client";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Youtube, Loader2, ExternalLink, Trash2, FileText, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { contentApi } from "@/lib/api/endpoints";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Queued", variant: "outline" },
  processing: { label: "Processing", variant: "secondary" },
  completed: { label: "Done", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
};

interface VideoNote {
  heading: string;
  content: string;
}

interface ProcessedVideo {
  id: string;
  youtube_url: string;
  title?: string;
  processing_status: string;
  error_message?: string;
  summary?: string;
  key_concepts?: string[];
  structured_notes?: VideoNote[] | string;
  duration_seconds?: number;
  created_at: string;
}

export default function ContentPage() {
  const qc = useQueryClient();
  const [url, setUrl] = useState("");
  const [selected, setSelected] = useState<ProcessedVideo | null>(null);
  const prevStatuses = useRef<Record<string, string>>({});

  const { data: videos, isLoading } = useQuery({
    queryKey: ["videos"],
    queryFn: () => contentApi.list({ limit: 20 }),
    refetchInterval: (data) => {
      const hasProcessing = (data?.state?.data as { videos?: ProcessedVideo[] })?.videos?.some((v: ProcessedVideo) => v.processing_status === "processing" || v.processing_status === "pending");
      return hasProcessing ? 5000 : false;
    },
  });

  useEffect(() => {
    const list = videos?.videos ?? [];
    list.forEach((v: ProcessedVideo) => {
      const prev = prevStatuses.current[v.id];
      if (prev && prev !== "failed" && v.processing_status === "failed") {
        if (v.error_message === "NO_TRANSCRIPT") {
          toast.error("No transcript available for this video. Try a video with captions enabled.");
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
      qc.invalidateQueries({ queryKey: ["videos"] });
    },
  });

  const isYouTube = (u: string) => /youtube\.com|youtu\.be/.test(u);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Content Processor</h1>
        <p className="text-sm text-muted-foreground">Turn YouTube lectures into structured notes</p>
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
              <Card key={v.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => v.processing_status === "completed" && setSelected(v)}>
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
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
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

      {/* Notes viewer */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="line-clamp-2">{selected?.title}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {selected.summary && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Summary</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{selected.summary}</p>
                </div>
              )}
              {selected.key_concepts?.length ? (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Key Concepts</h3>
                  <div className="flex flex-wrap gap-1">
                    {selected.key_concepts.map((c) => (
                      <Badge key={c} variant="secondary">{c}</Badge>
                    ))}
                  </div>
                </div>
              ) : null}
              {selected.structured_notes && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Notes</h3>
                  <div className="space-y-3">
                    {Array.isArray(selected.structured_notes)
                      ? selected.structured_notes.map((note, i) => (
                          <div key={i} className="rounded-md bg-muted p-3">
                            {note.heading && (
                              <p className="text-xs font-semibold mb-1">{note.heading}</p>
                            )}
                            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{note.content}</p>
                          </div>
                        ))
                      : (
                          <div className="rounded-md bg-muted p-3 text-xs leading-relaxed whitespace-pre-wrap">
                            {selected.structured_notes}
                          </div>
                        )
                    }
                  </div>
                </div>
              )}
              <Button variant="outline" size="sm" asChild>
                <a href={selected.youtube_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3 mr-2" />
                  Watch on YouTube
                </a>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
