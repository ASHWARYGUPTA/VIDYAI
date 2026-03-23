"use client";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, BookOpen, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { tutorApi } from "@/lib/api/endpoints";
import { NoteRenderer } from "@/components/markdown-renderer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
      {/* Header */}
      <div className="border-b border-blue-100/60 bg-white p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-2.5 shadow-lg shadow-blue-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">AI Tutor</h1>
            <p className="text-sm text-gray-500">Ask any doubt — I&apos;ll explain using your syllabus</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="flex h-full items-center justify-center">
                <div className="text-center space-y-3">
                  <div className="mx-auto rounded-2xl bg-blue-50 p-5 w-fit">
                    <BookOpen className="h-10 w-10 text-blue-400" />
                  </div>
                  <p className="text-gray-400 text-sm">Ask your first question to get started</p>
                  <div className="flex flex-wrap gap-2 justify-center max-w-md">
                    {["Explain Newton's third law", "What is mitosis?", "Fundamental Rights in India"].map((q) => (
                      <button
                        key={q}
                        onClick={() => { setQuestion(q); }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-tr-sm shadow-md shadow-blue-500/20"
                      : "bg-white border border-blue-100/60 rounded-tl-sm shadow-sm"
                  }`}
                >
                  {msg.role === "user" ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <NoteRenderer markdown={msg.content} />
                  )}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 space-y-1.5 border-t border-blue-100/40 pt-2">
                      <p className="text-xs font-medium text-blue-600/70">Sources</p>
                      {msg.sources.slice(0, 4).map((s, si) => (
                        <div key={si} className="text-xs text-gray-500">
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
                <div className="bg-white border border-blue-100/60 rounded-2xl rounded-tl-sm px-4 py-3 space-y-2 shadow-sm">
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-blue-100/60 bg-white p-4">
            <div className="flex gap-2 items-end">
              <Textarea
                placeholder="Ask a doubt…"
                className="resize-none min-h-[44px] max-h-32 border-gray-200 focus:border-blue-300 bg-white"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!question.trim() || askMutation.isPending}
                className="bg-gradient-to-r from-blue-600 to-blue-500 shadow-md shadow-blue-500/20 shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* History sidebar */}
        <div className="hidden lg:flex w-72 flex-col border-l border-blue-100/60 bg-white">
          <div className="p-4 border-b border-blue-100/60">
            <h2 className="text-sm font-semibold text-gray-800">Recent Sessions</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {histLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
            ) : history?.doubts?.length ? (
              history.doubts.map((s: { id: string; question_text: string; created_at: string }) => (
                <button
                  key={s.id}
                  onClick={() => setDoubtId(s.id)}
                  className={`w-full rounded-xl border p-3 text-left text-sm transition-all hover:shadow-sm ${
                    doubtId === s.id
                      ? "border-blue-400 bg-blue-50/80 shadow-sm shadow-blue-500/10"
                      : "border-gray-200 hover:border-blue-200 hover:bg-blue-50/30"
                  }`}
                >
                  <p className="font-medium line-clamp-2 text-gray-800">{s.question_text}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatIST(s.created_at)}</p>
                </button>
              ))
            ) : (
              <p className="text-xs text-gray-400 p-2">No history yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
