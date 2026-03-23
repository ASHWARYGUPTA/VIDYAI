"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { partnerApi } from "@/lib/api/partner-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [checking, setChecking] = useState(true);

  // If already authenticated, skip the form
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        try {
          await partnerApi.validate();
          router.replace("/dashboard");
        } catch {
          router.replace("/onboarding");
        }
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  if (checking) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    // Check if user has completed onboarding
    try {
      await partnerApi.validate();
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch {
      toast("Account found. Let's set up your organisation.");
      router.push("/onboarding");
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center gap-2">
          <Zap className="h-6 w-6 text-primary" />
          <span className="text-2xl font-bold">VidyAI Partners</span>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Access your Partner Portal dashboard.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="you@company.com" value={email}
                  onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={password}
                  onChange={e => setPassword(e.target.value)} required />
              </div>
              <Button className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                New partner?{" "}
                <Link href="/signup" className="text-primary hover:underline font-medium">
                  Create account
                </Link>
              </p>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}
