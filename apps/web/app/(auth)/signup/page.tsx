"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, User, ArrowRight } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 8 ? 2 : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (signUpError) {
      toast.error(signUpError.message);
      setLoading(false);
      return;
    }
    if (!signUpData.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        toast.success("Account created! Please check your email to confirm before signing in.");
        router.push("/login");
        setLoading(false);
        return;
      }
    }
    router.push("/onboarding");
    setLoading(false);
  }

  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  return (
    <Card className="border-blue-100/50 shadow-xl shadow-blue-500/5 bg-white/80 backdrop-blur-sm">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-xl">Create account</CardTitle>
        <CardDescription>Start your free learning journey today</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="name"
                placeholder="Arjun Sharma"
                className="pl-10 bg-white border-gray-200 focus:border-blue-300 focus:ring-blue-200"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="pl-10 bg-white border-gray-200 focus:border-blue-300 focus:ring-blue-200"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type="password"
                placeholder="Min. 8 characters"
                className="pl-10 bg-white border-gray-200 focus:border-blue-300 focus:ring-blue-200"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {/* Password strength indicator */}
            {password.length > 0 && (
              <div className="flex gap-1 pt-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      level <= passwordStrength
                        ? passwordStrength <= 1 ? "bg-red-400" : passwordStrength <= 2 ? "bg-amber-400" : passwordStrength <= 3 ? "bg-blue-400" : "bg-green-500"
                        : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
          <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-500/25 transition-all" disabled={loading}>
            {loading ? "Creating account…" : (
              <span className="flex items-center gap-2">Create account <ArrowRight className="h-4 w-4" /></span>
            )}
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-gray-400">Or continue with</span>
            </div>
          </div>
          <Button type="button" variant="outline" className="w-full border-gray-200 hover:bg-blue-50/50 hover:border-blue-200 transition-colors" onClick={handleGoogle}>
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </Button>
        </CardContent>
      </form>
      <CardFooter className="justify-center text-sm text-gray-500 pb-6">
        Already have an account?&nbsp;
        <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium hover:underline underline-offset-4 transition-colors">Sign in</Link>
      </CardFooter>
    </Card>
  );
}
