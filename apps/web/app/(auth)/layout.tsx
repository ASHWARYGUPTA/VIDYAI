export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-white via-blue-50/40 to-blue-100/50 overflow-hidden">
      {/* Decorative blurred orbs */}
      <div className="absolute top-20 -left-32 w-80 h-80 bg-blue-400/15 rounded-full blur-[100px]" />
      <div className="absolute bottom-10 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-300/5 rounded-full blur-[150px]" />

      <div className="relative w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
              VidyAI
            </h1>
          </div>
          <p className="text-sm text-gray-500">AI-powered learning for JEE, NEET &amp; UPSC</p>
        </div>
        {children}
      </div>
    </div>
  );
}
