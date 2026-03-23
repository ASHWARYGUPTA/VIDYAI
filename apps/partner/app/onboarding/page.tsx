"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Zap, Building2, Code2, CheckCircle2, ArrowRight, Copy, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { partnerApi } from "@/lib/api/partner-client";

const STEPS = [
  { id: 1, title: "Organisation",   icon: Building2 },
  { id: 2, title: "Choose features", icon: Zap },
  { id: 3, title: "Embed snippet",  icon: Code2 },
  { id: 4, title: "All set",        icon: CheckCircle2 },
];

const ALL_FEATURES = ["tutor", "planner", "tests", "graph", "knowledge", "content"];
const FEATURE_META: Record<string, { label: string; desc: string }> = {
  tutor:     { label: "AI Tutor",          desc: "RAG-grounded doubt solver" },
  planner:   { label: "Study Planner",     desc: "AI daily plan generator" },
  tests:     { label: "MCQ / PYQ Tests",   desc: "Adaptive JEE/NEET quizzes" },
  graph:     { label: "Knowledge Graph",   desc: "Concept mastery visualisation" },
  knowledge: { label: "Knowledge Base",    desc: "Search uploaded documents" },
  content:   { label: "Content Processor", desc: "YouTube → structured notes" },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep]         = useState(1);
  const [orgName, setOrgName]   = useState("");
  const [website, setWebsite]   = useState("");
  const [saving, setSaving]     = useState(false);
  const [features, setFeatures] = useState(["tutor", "planner", "tests"]);
  const [copied, setCopied]     = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [authReady, setAuthReady] = useState(false);

  // Ensure user is logged in — redirect to login if not
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/login");
      } else {
        setAuthReady(true);
      }
    });
  }, [router]);

  function toggleFeature(f: string) {
    setFeatures(p => p.includes(f) ? p.filter(x => x !== f) : [...p, f]);
  }

  async function createOrg() {
    if (!orgName.trim()) return;
    setSaving(true);
    try {
      const res = await partnerApi.onboard(orgName.trim(), website.trim() || undefined);
      setPartnerName(res.org_name);
      setStep(2);
    } catch (err: unknown) {
      const e = err as { status?: number; detail?: { error?: string } };
      if (e?.status === 409) {
        toast("Organisation already set up — redirecting to dashboard.");
        router.push("/dashboard");
        return;
      }
      const msg = e?.detail?.error ?? "Failed to create organisation";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const embedSnippet = `<script src="${API_URL}/static/embed.js" defer></script>
<script>
  // Your server: POST ${API_URL}/api/v1/embed/session
  // with your API key → returns a short-lived embed token
  VidyAI.init({ embedToken: "et_...", theme: "light", language: "en" });
${features.includes("tutor")     ? '  VidyAI.tutor("#vidyai-tutor");\n' : ""}${features.includes("planner")   ? '  VidyAI.planner("#vidyai-planner");\n' : ""}${features.includes("tests")     ? '  VidyAI.tests("#vidyai-tests");\n' : ""}${features.includes("graph")     ? '  VidyAI.graph("#vidyai-graph");\n' : ""}${features.includes("knowledge") ? '  VidyAI.knowledge("#vidyai-kb");\n' : ""}${features.includes("content")   ? '  VidyAI.content("#vidyai-content");\n' : ""}</script>`;

  function copySnippet() {
    navigator.clipboard.writeText(embedSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Snippet copied!");
  }

  if (!authReady) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Zap className="h-6 w-6 text-primary" />
            <span className="text-2xl font-bold">VidyAI Partners</span>
          </div>
          <p className="text-sm text-muted-foreground">Set up your organisation in 4 steps</p>
        </div>

        {/* Step pills */}
        <div className="flex items-center justify-center gap-1 flex-wrap">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1">
              <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                step === s.id
                  ? "bg-primary text-primary-foreground"
                  : step > s.id
                  ? "bg-green-100 text-green-700"
                  : "bg-muted text-muted-foreground"
              }`}>
                {step > s.id ? <CheckCircle2 className="h-3 w-3" /> : <s.icon className="h-3 w-3" />}
                <span className="hidden sm:inline">{s.title}</span>
              </div>
              {i < STEPS.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground mx-0.5" />}
            </div>
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Name your organisation</CardTitle>
              <CardDescription>This is the name displayed in the Partner Portal and usage reports.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Organisation name</Label>
                <Input placeholder="e.g. PhysicsWallah" value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && orgName.trim() && createOrg()} />
              </div>
              <div className="space-y-2">
                <Label>Website <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input placeholder="https://yoursite.com" value={website}
                  onChange={e => setWebsite(e.target.value)} />
              </div>
              <Button className="w-full" onClick={createOrg} disabled={!orgName.trim() || saving}>
                {saving ? "Setting up…" : "Continue"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Choose features to embed</CardTitle>
              <CardDescription>Select which VidyAI widgets you want. Change anytime in Settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {ALL_FEATURES.map(f => {
                  const selected = features.includes(f);
                  return (
                    <button key={f} onClick={() => toggleFeature(f)}
                      className={`rounded-lg border p-3 text-left transition-all ${
                        selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{FEATURE_META[f].label}</span>
                        {selected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{FEATURE_META[f].desc}</p>
                    </button>
                  );
                })}
              </div>
              <Button className="w-full" onClick={() => setStep(3)} disabled={features.length === 0}>
                Continue <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Copy your embed snippet</CardTitle>
              <CardDescription>
                Paste this into your site. You&apos;ll need an API key to exchange for embed tokens — create one in the Keys page after setup.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100 leading-relaxed max-h-56">
                  <code>{embedSnippet}</code>
                </pre>
                <button onClick={copySnippet}
                  className="absolute right-3 top-3 rounded-md bg-slate-700 p-1.5 text-slate-300 hover:bg-slate-600">
                  {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Selected: {features.map(f => (
                  <Badge key={f} variant="secondary" className="text-[10px] mx-0.5 capitalize">{f}</Badge>
                ))}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
                <Button onClick={() => setStep(4)} className="flex-1">
                  Done <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <Card className="border-green-500/40 bg-green-50/30">
            <CardContent className="flex flex-col items-center py-10 text-center gap-4">
              <div className="rounded-full bg-green-100 p-4">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Organisation ready!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>{partnerName}</strong> is set up on VidyAI Partners.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4 w-full text-left space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Key className="h-4 w-4 text-primary" />
                  Next: create your first API key
                </p>
                <p className="text-xs text-muted-foreground">
                  Your server uses an API key to get short-lived embed tokens for students. Never put the API key in browser JS.
                </p>
              </div>
              <div className="flex gap-3 w-full">
                <Button variant="outline" className="flex-1" onClick={() => router.push("/dashboard")}>
                  Dashboard
                </Button>
                <Button className="flex-1" onClick={() => router.push("/keys")}>
                  <Key className="h-4 w-4 mr-2" />
                  Create API Key
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
