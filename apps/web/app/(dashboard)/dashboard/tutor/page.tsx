"use client";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { tutorApi } from "@/lib/api/endpoints";
import { NoteRenderer } from "@/components/markdown-renderer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIST } from "@/lib/utils";

interface Source {
  title?: string;
  chapter?: string;
  page?: number | null;
  excerpt?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  tokens_used?: number;
  created_at?: string;
}

export default function TutorPage() {
  const [question, setQuestion] = useState("");
  const [doubtId, setDoubtId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: history, isLoading: histLoading } = useQuery({
    queryKey: ["tutor-history"],
    queryFn: () => tutorApi.history({ limit: 5 }) as Promise<{ doubts?: { id: string; question_text: string; created_at: string }[] }>,
  });

  const askMutation = useMutation({
    mutationFn: (q: string) => tutorApi.ask({ question: q }),
    onSuccess: (data) => {
      setDoubtId(String(data.doubt_id) ?? null);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer, sources: data.sources, tokens_used: data.tokens_used },
      ]);
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: { status?: number }) => {
      if (err.status === 429) toast.error("Daily question limit reached. Upgrade to Pro for unlimited questions.");
      else toast.error("Failed to get answer. Try again.");
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    const q = question.trim();
    if (!q || askMutation.isPending) return;
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setQuestion("");
    askMutation.mutate(q);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-6">
        <h1 className="text-xl font-semibold">AI Tutor</h1>
        <p className="text-sm text-muted-foreground">Ask any doubt — I&apos;ll explain using your syllabus</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="flex h-full items-center justify-center">
                <div className="text-center space-y-2">
                  <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/30" />
                  <p className="text-muted-foreground">Ask your first question to get started</p>
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted rounded-tl-sm"
                  }`}
                >
                  {msg.role === "user" ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <NoteRenderer markdown={msg.content} />
                  )}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 space-y-1.5 border-t border-border/40 pt-2">
                      <p className="text-xs font-medium opacity-70">Sources</p>
                      {msg.sources.slice(0, 4).map((s, si) => (
                        <div key={si} className="text-xs opacity-60">
                          <span className="font-medium">{s.title ?? "Reference"}</span>
                          {s.chapter ? <span> › {s.chapter}</span> : null}
                          {s.page ? <span className="ml-1 opacity-70">p.{s.page}</span> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {askMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 space-y-2">
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t p-4">
            <div className="flex gap-2 items-end">
              <Textarea
                placeholder="Ask a doubt…"
                className="resize-none min-h-[44px] max-h-32"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <Button size="icon" onClick={handleSend} disabled={!question.trim() || askMutation.isPending}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* History sidebar */}
        <div className="hidden lg:flex w-72 flex-col border-l">
          <div className="p-4 border-b">
            <h2 className="text-sm font-semibold">Recent Sessions</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {histLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)
            ) : history?.doubts?.length ? (
              history.doubts.map((s: { id: string; question_text: string; created_at: string }) => (
                <button
                  key={s.id}
                  onClick={() => setDoubtId(s.id)}
                  className={`w-full rounded-lg border p-3 text-left text-sm transition-colors hover:bg-accent ${doubtId === s.id ? "border-primary bg-primary/5" : ""}`}
                >
                  <p className="font-medium line-clamp-2">{s.question_text}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatIST(s.created_at)}</p>
                </button>
              ))
            ) : (
              <p className="text-xs text-muted-foreground p-2">No history yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
