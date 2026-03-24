"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { partnerApi } from "@/lib/api/partner-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, CheckCircle2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.vidyai.in";

function CodeBlock({ code, id, copiedId, onCopy }: {
  code: string; id: string; copiedId: string | null; onCopy: (c: string, i: string) => void;
}) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100 leading-relaxed">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => onCopy(code, id)}
        className="absolute right-3 top-3 rounded-md bg-slate-700 p-1.5 text-slate-300 hover:bg-slate-600 transition-colors"
      >
        {copiedId === id
          ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
          : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

const MCP_TOOLS = [
  { name: "solve_doubt",           feature: "tutor",     desc: "Answer a student question using RAG over the knowledge base." },
  { name: "get_revision_deck",     feature: "retention", desc: "Get today's FSRS-scheduled flashcards for a student." },
  { name: "submit_revision_result",feature: "retention", desc: "Submit flashcard review quality (0–5) and update FSRS state." },
  { name: "get_study_plan",        feature: "planner",   desc: "Get the student's AI-generated daily study plan." },
  { name: "run_mcq_test",          feature: "tests",     desc: "Start a new MCQ/PYQ test session with adaptive difficulty." },
  { name: "submit_mcq_answers",    feature: "tests",     desc: "Submit answers and get graded results with explanations." },
  { name: "process_video",         feature: "content",   desc: "Enqueue a YouTube video for transcript + structured notes." },
  { name: "get_video_status",      feature: "content",   desc: "Poll processing status and retrieve structured notes." },
  { name: "get_knowledge_graph",   feature: "graph",     desc: "Get the student's concept mastery graph by subject." },
];

export default function DocsPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: settings } = useQuery({
    queryKey: ["partner-settings"],
    queryFn: () => partnerApi.settings.get(),
  });

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Copied!");
  }

  const embedSnippet = `<!-- 1. Add to your site's <head> -->
<script src="${API_URL}/static/embed.js" defer></script>

<!-- 2. Your server exchanges the API key for a short-lived embed token.
     Call this on your backend when a student logs in: -->
<!--
POST ${API_URL}/api/v1/embed/session
Authorization: Bearer vida_live_YOUR_KEY
Content-Type: application/json

{
  "student_id": "your-student-uuid",
  "exam_type": "JEE",
  "features": ["tutor", "planner", "tests", "graph"]
}
-->

<!-- 3. Pass the embed token to your frontend and init: -->
<script>
  VidyAI.init({
    embedToken: "et_...",   // short-lived, from your server
    theme: "light",         // "light" | "dark"
    language: "en",         // "en" | "hi"
  });

  // Mount widgets wherever you need them:
  VidyAI.tutor("#vidyai-tutor");       // AI Tutor chat
  VidyAI.planner("#vidyai-planner");   // Study Planner
  VidyAI.tests("#vidyai-tests");       // MCQ / PYQ Tests
  VidyAI.graph("#vidyai-graph");       // Knowledge Graph
</script>`;

  const serverTokenSnippet = `# Python example (FastAPI / Flask / Django)
import requests

def get_embed_token(student_id: str, exam_type: str) -> str:
    resp = requests.post(
        "${API_URL}/api/v1/embed/session",
        headers={
            "Authorization": "Bearer vida_live_YOUR_KEY",
            "Content-Type": "application/json",
        },
        json={
            "student_id": student_id,
            "exam_type": exam_type,           # "JEE" | "NEET" | "UPSC"
            "features": ["tutor", "planner", "tests", "graph"],
            "ttl_minutes": 60,                # optional, default 60
        },
    )
    resp.raise_for_status()
    return resp.json()["embed_token"]`;

  const mcpSnippet = `# Direct MCP JSON-RPC call (server-to-server)
import requests, json

response = requests.post(
    "${API_URL}/mcp",
    headers={
        "Authorization": "Bearer vida_live_YOUR_KEY",
        "Content-Type": "application/json",
    },
    json={
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "solve_doubt",
            "arguments": {
                "student_id": "stu_123",
                "question": "Explain Newton's second law",
                "subject": "Physics",
                "exam_type": "JEE",
            },
        },
    },
)
print(response.json()["result"]["answer"])`;

  const webhookSnippet = `# Verify the webhook signature on your server
import hmac, hashlib

def verify_signature(raw_body: bytes, header: str, secret: str) -> bool:
    expected = "sha256=" + hmac.new(
        secret.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, header)

# Webhook payload example:
# {
#   "event": "video.processed",
#   "partner_id": "...",
#   "student_id": "...",
#   "data": { "video_id": "...", "notes": {...} },
#   "timestamp": "2026-01-01T00:00:00Z"
# }`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Docs & SDK</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Everything you need to embed VidyAI into your platform.
        </p>
      </div>

      <Tabs defaultValue="quickstart">
        <TabsList>
          <TabsTrigger value="quickstart">Quickstart</TabsTrigger>
          <TabsTrigger value="mcp">MCP / Direct API</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="reference">Tool Reference</TabsTrigger>
        </TabsList>

        {/* Quickstart */}
        <TabsContent value="quickstart" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Step 1 — Add the embed script</CardTitle>
              <CardDescription>
                Paste this snippet into any page where you want VidyAI widgets. Your server
                must exchange your API key for a short-lived embed token so the secret is never
                exposed in the browser.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock code={embedSnippet} id="embed" copiedId={copiedId} onCopy={copy} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Step 2 — Server-side token exchange</CardTitle>
              <CardDescription>
                Call this from your backend when a student authenticates. The embed token has a
                60-minute TTL by default and is scoped to the features you specify.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock code={serverTokenSnippet} id="server" copiedId={copiedId} onCopy={copy} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Allowed plan features</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(settings?.allowed_features ?? ["tutor","planner","tests","graph","knowledge","content"]).map((f) => (
                <Badge key={f} variant="secondary" className="capitalize">{f}</Badge>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MCP / Direct */}
        <TabsContent value="mcp" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Direct MCP JSON-RPC (server-to-server)</CardTitle>
              <CardDescription>
                Use this when you want to call VidyAI tools from your own LLM agent or backend
                without the browser SDK. Supports JSON-RPC 2.0 + SSE streaming for tutor answers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock code={mcpSnippet} id="mcp" copiedId={copiedId} onCopy={copy} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks */}
        <TabsContent value="webhooks" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Webhook verification</CardTitle>
              <CardDescription>
                All webhook POST requests include an <code className="text-xs">X-VidyAI-Signature</code> header.
                Verify it using your API key as the HMAC secret.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock code={webhookSnippet} id="webhook" copiedId={copiedId} onCopy={copy} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Configure webhook URL</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Go to <a href="/settings" className="text-primary hover:underline">Settings → Webhook URL</a> to register your endpoint.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tool reference */}
        <TabsContent value="reference" className="space-y-3 mt-4">
          {MCP_TOOLS.map((t) => (
            <Card key={t.name}>
              <CardContent className="py-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-semibold">{t.name}</code>
                    <Badge variant="outline" className="text-[10px] capitalize">{t.feature}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{t.desc}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => copy(t.name, t.name)}
                >
                  {copiedId === t.name
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
