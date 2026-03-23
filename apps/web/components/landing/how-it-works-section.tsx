"use client";

import { Badge } from "@/components/ui/badge";
import { UserPlus, Rocket, Trophy } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Sign Up & Set Your Goal",
    description:
      "Tell us your target exam, available hours, and preferred subjects. Our AI instantly builds a personalized study roadmap.",
    gradient: "from-violet-500 to-purple-500",
  },
  {
    icon: Rocket,
    step: "02",
    title: "Learn & Retain with AI",
    description:
      "Study with the AI tutor, explore the knowledge graph, and let spaced repetition handle your revision schedule automatically.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Trophy,
    step: "03",
    title: "Master & Conquer",
    description:
      "Track your mastery with analytics, take adaptive mock tests, and walk into your exam day with unshakeable confidence.",
    gradient: "from-emerald-500 to-teal-500",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative py-32 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-20">
          <Badge
            variant="outline"
            className="mb-4 px-4 py-1.5 border-blue-300 text-blue-600 bg-blue-50 rounded-full"
          >
            How It Works
          </Badge>
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Three Steps to
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Exam Mastery
            </span>
          </h2>
        </div>

        {/* Steps */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Connector line — desktop only */}
          <div className="hidden md:block absolute top-24 left-[16.5%] right-[16.5%] h-px bg-gradient-to-r from-blue-300 via-blue-400 to-blue-300" />

          {steps.map((s, i) => (
            <div key={s.step} className="relative flex flex-col items-center text-center group">
              {/* Step circle */}
              <div className="relative mb-8">
                <div
                  className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${s.gradient} bg-opacity-10 flex items-center justify-center shadow-2xl transition-transform duration-300 group-hover:scale-110`}
                  style={{
                    border: '1px solid rgba(59,130,246,0.15)',
                    background: `linear-gradient(135deg, rgba(59,130,246,0.08), rgba(59,130,246,0.04))`,
                  }}
                >
                  <s.icon className="w-8 h-8 text-blue-500 group-hover:text-blue-700 transition-colors" />
                </div>
                {/* Step number badge */}
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                  {s.step}
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-3">{s.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
