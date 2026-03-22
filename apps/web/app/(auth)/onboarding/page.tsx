"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const EXAM_TYPES = [
  { value: "JEE", label: "JEE", desc: "Joint Entrance Examination — Engineering" },
  { value: "NEET", label: "NEET", desc: "National Eligibility cum Entrance Test — Medical" },
  { value: "UPSC", label: "UPSC", desc: "Union Public Service Commission — Civil Services" },
];

const CLASSES = [
  { value: "11", label: "Class 11" },
  { value: "12", label: "Class 12" },
  { value: "dropper", label: "Dropper" },
  { value: "graduate", label: "Graduate" },
];

const HOURS = [1, 2, 3, 4, 5, 6, 8];

type Step = 1 | 2 | 3;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState({
    full_name: "",
    exam_target: "",
    current_class: "",
    exam_date: "",
    daily_study_hours: 4,
  });
  const [loading, setLoading] = useState(false);

  function set(key: string, value: string | number) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      await api.post("/api/v1/auth/onboard", {
        full_name: form.full_name,
        exam_target: form.exam_target,
        current_class: form.current_class || undefined,
        exam_date: form.exam_date || undefined,
        daily_study_hours: form.daily_study_hours,
        preferred_language: "en",
      });
      router.push("/dashboard");
    } catch (err: unknown) {
      const e = err as { detail?: { code?: string } };
      if (e?.detail?.code === "ONBOARDING_COMPLETE") {
        router.push("/dashboard");
        return;
      }
      toast.error("Failed to save preferences. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">VidyAI</h1>
          <p className="text-muted-foreground mt-1 text-sm">Let&apos;s set up your learning profile</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <Card>
          {/* Step 1 — Name */}
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle>What&apos;s your name?</CardTitle>
                <CardDescription>This is how we&apos;ll address you</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full name</Label>
                  <Input
                    id="full_name"
                    placeholder="Arjun Sharma"
                    value={form.full_name}
                    onChange={(e) => set("full_name", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && form.full_name.trim() && setStep(2)}
                    autoFocus
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => setStep(2)}
                  disabled={!form.full_name.trim()}
                >
                  Continue
                </Button>
              </CardContent>
            </>
          )}

          {/* Step 2 — Exam */}
          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle>Which exam, {form.full_name.split(" ")[0]}?</CardTitle>
                <CardDescription>We&apos;ll build your syllabus around it</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  {EXAM_TYPES.map((e) => (
                    <button
                      key={e.value}
                      onClick={() => set("exam_target", e.value)}
                      className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent ${
                        form.exam_target === e.value ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{e.label}</div>
                        <div className="text-sm text-muted-foreground">{e.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                  <Button className="flex-1" onClick={() => setStep(3)} disabled={!form.exam_target}>Continue</Button>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 3 — Class, date, hours */}
          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle>Almost there!</CardTitle>
                <CardDescription>A few more details to personalise your plan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>Current class / year</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {CLASSES.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => set("current_class", c.value)}
                        className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent ${
                          form.current_class === c.value ? "border-primary bg-primary/5 text-primary" : ""
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="exam_date">Target exam date <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input
                    id="exam_date"
                    type="date"
                    value={form.exam_date}
                    onChange={(e) => set("exam_date", e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Daily study hours</Label>
                  <div className="flex flex-wrap gap-2">
                    {HOURS.map((h) => (
                      <button
                        key={h}
                        onClick={() => set("daily_study_hours", h)}
                        className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent ${
                          form.daily_study_hours === h ? "border-primary bg-primary/5 text-primary" : ""
                        }`}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Back</Button>
                  <Button className="flex-1" onClick={handleSubmit} disabled={loading || !form.current_class}>
                    {loading ? "Setting up your plan…" : "Start learning"}
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
