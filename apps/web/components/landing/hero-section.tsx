"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

const Antigravity = dynamic(() => import("@/components/Antigravity"), {
  ssr: false,
});

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white">
      {/* Antigravity Background */}
      <div className="absolute inset-0 z-0">
        <Antigravity
          count={510}
          magnetRadius={12}
          ringRadius={10}
          waveSpeed={0.4}
          waveAmplitude={1}
          particleSize={2}
          lerpSpeed={0.18}
          color="#2a75c6"
          autoAnimate
          particleVariance={0.5}
          rotationSpeed={0}
          depthFactor={1}
          pulseSpeed={3}
          particleShape="capsule"
          fieldStrength={7}
        />
      </div>

      {/* Radial gradient overlays */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-transparent via-transparent to-white" />
      <div className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_20%,white_80%)] opacity-40" />

      {/* Content */}
      <div className="relative z-10 text-center max-w-5xl mx-auto px-6 py-32">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 backdrop-blur-sm mb-8 animate-fade-in-up">
          <Sparkles className="w-4 h-4 text-blue-500" />
          <span className="text-sm text-blue-700">
            AI-Powered Learning for JEE, NEET &amp; UPSC
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[1.05] tracking-tight mb-6 animate-fade-in-up animation-delay-100">
          <span className="bg-gradient-to-b from-gray-900 via-gray-800 to-gray-600 bg-clip-text text-transparent">
            Nothing Forgotten.
          </span>
          <br />
          <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
            Everything Mastered.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up animation-delay-200">
          VidyAI uses <span className="text-gray-900 font-medium">spaced repetition</span>,{" "}
          <span className="text-gray-900 font-medium">adaptive AI tutoring</span>, and{" "}
          <span className="text-gray-900 font-medium">knowledge graphs</span> to transform how you
          study — so you retain more, stress less, and crack your dream exam.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up animation-delay-300">
          <Link href="/signup">
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-full px-8 h-14 text-base shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all hover:scale-105 group"
            >
              Start Learning Free
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <a href="#features">
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-8 h-14 text-base border-blue-200 text-blue-700 hover:text-blue-800 hover:bg-blue-50 hover:border-blue-300 backdrop-blur-sm transition-all"
            >
              Explore Features
            </Button>
          </a>
        </div>

        {/* Floating stats */}
        <div className="grid grid-cols-3 gap-6 mt-20 max-w-lg mx-auto animate-fade-in-up animation-delay-400">
          {[
            { value: "95%", label: "Retention Rate" },
            { value: "10K+", label: "Concepts Covered" },
            { value: "24/7", label: "AI Tutor Access" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs sm:text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom fade for smooth section transition */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-50 to-transparent z-20" />
    </section>
  );
}
