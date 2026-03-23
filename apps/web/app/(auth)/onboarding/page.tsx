"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, FlaskConical, Landmark, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";

const EXAM_TYPES = [
  { value: "JEE", label: "JEE", desc: "Joint Entrance Examination — Engineering", icon: FlaskConical, color: "blue" },
  { value: "NEET", label: "NEET", desc: "National Eligibility cum Entrance Test — Medical", icon: GraduationCap, color: "emerald" },
  { value: "UPSC", label: "UPSC", desc: "Union Public Service Commission — Civil Services", icon: Landmark, color: "violet" },
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
    <div className="space-y-6">
      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
              s <= step
                ? "bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm shadow-blue-500/20"
                : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      <Card className="border-blue-100/50 shadow-xl shadow-blue-500/5 bg-white/80 backdrop-blur-sm overflow-hidden">
        {/* Step 1 — Name */}
        {step === 1 && (
          <>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">What&apos;s your name?</CardTitle>
              <CardDescription>This is how we&apos;ll address you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  placeholder="Arjun Sharma"
                  className="bg-white border-gray-200 focus:border-blue-300"
                  value={form.full_name}
                  onChange={(e) => set("full_name", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && form.full_name.trim() && setStep(2)}
                  autoFocus
                />
              </div>
              <Button
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-500/25"
                onClick={() => setStep(2)}
                disabled={!form.full_name.trim()}
              >
                Continue <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </>
        )}

        {/* Step 2 — Exam */}
        {step === 2 && (
          <>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Which exam, {form.full_name.split(" ")[0]}?</CardTitle>
              <CardDescription>We&apos;ll build your syllabus around it</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="grid gap-3">
                {EXAM_TYPES.map((e) => {
                  const isSelected = form.exam_target === e.value;
                  const Icon = e.icon;
                  return (
                    <button
                      key={e.value}
                      onClick={() => set("exam_target", e.value)}
                      className={`flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                        isSelected
                          ? "border-blue-500 bg-blue-50/80 shadow-md shadow-blue-500/10"
                          : "border-gray-200 hover:border-blue-200 hover:bg-blue-50/30"
                      }`}
                    >
                      <div className={`rounded-lg p-2 ${isSelected ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"} transition-colors`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold">{e.label}</div>
                        <div className="text-sm text-gray-500">{e.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-gray-200 hover:bg-blue-50/50" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-500/25"
                  onClick={() => setStep(3)}
                  disabled={!form.exam_target}
                >
                  Continue <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {/* Step 3 — Class, date, hours */}
        {step === 3 && (
          <>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-500" /> Almost there!
              </CardTitle>
              <CardDescription>A few more details to personalise your plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-2">
              <div className="space-y-2">
                <Label>Current class / year</Label>
                <div className="grid grid-cols-2 gap-2">
                  {CLASSES.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => set("current_class", c.value)}
                      className={`rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${
                        form.current_class === c.value
                          ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm shadow-blue-500/10"
                          : "border-gray-200 hover:border-blue-200 hover:bg-blue-50/30"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="exam_date">Target exam date <span className="text-gray-400 text-xs">(optional)</span></Label>
                <Input
                  id="exam_date"
                  type="date"
                  className="bg-white border-gray-200 focus:border-blue-300"
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
                      className={`rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all ${
                        form.daily_study_hours === h
                          ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm shadow-blue-500/10"
                          : "border-gray-200 hover:border-blue-200 hover:bg-blue-50/30"
                      }`}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-gray-200 hover:bg-blue-50/50" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-500/25"
                  onClick={handleSubmit}
                  disabled={loading || !form.current_class}
                >
                  {loading ? "Setting up your plan…" : (
                    <span className="flex items-center gap-2">Start learning <Sparkles className="h-4 w-4" /></span>
                  )}
                </Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
