"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    if (!data.session) {
      // Email confirmation required
      toast.success("Check your email to confirm your account, then sign in.");
      router.push("/login");
      setLoading(false);
      return;
    }
    toast.success("Account created! Let's set up your organisation.");
    router.push("/onboarding");
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
            <CardTitle>Create partner account</CardTitle>
            <CardDescription>Sign up to embed VidyAI into your platform. Free to start.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Work email</Label>
                <Input type="email" placeholder="you@company.com" value={email}
                  onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" placeholder="Min. 8 characters" value={password}
                  onChange={e => setPassword(e.target.value)} required />
              </div>
              <Button className="w-full" disabled={loading}>
                {loading ? "Creating account…" : "Create account"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}
