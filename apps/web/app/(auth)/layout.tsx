export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">VidyAI</h1>
          <p className="text-muted-foreground mt-1 text-sm">AI-powered learning for JEE &amp; NEET</p>
        </div>
        {children}
      </div>
    </div>
  );
}
