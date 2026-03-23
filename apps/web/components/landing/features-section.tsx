"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  RefreshCcw,
  Network,
  ClipboardCheck,
  CalendarDays,
  BarChart3,
  BookOpen,
  ListChecks,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Tutor",
    description:
      "Your personal Socratic companion that adapts to your learning pace. Ask anything — from organic chemistry mechanisms to UPSC current affairs — and get crystal-clear, concept-first explanations with follow-up drills.",
    tag: "Core AI",
    gradient: "from-violet-500 to-purple-500",
  },
  {
    icon: RefreshCcw,
    title: "Smart Revision",
    description:
      "Scientifically-driven spaced repetition engine based on the Ebbinghaus forgetting curve. VidyAI schedules your revisions at the optimal moment so you remember 95% of what you learn — forever.",
    tag: "Retention",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Network,
    title: "Knowledge Graph",
    description:
      "See the invisible connections between concepts. Our interactive knowledge graph maps your entire syllabus as an interconnected neural web — helping you understand why topics link and where gaps hide.",
    tag: "Visualization",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    icon: ClipboardCheck,
    title: "Adaptive Tests",
    description:
      "AI-generated tests that mirror JEE Advanced, NEET, and UPSC patterns. Each test dynamically adjusts difficulty based on your weak zones — no wasted time on topics you already know.",
    tag: "Assessment",
    gradient: "from-orange-500 to-amber-500",
  },
  {
    icon: CalendarDays,
    title: "Study Planner",
    description:
      "An AI-optimized study schedule built around your goals, deadlines, and energy levels. Automatically reprioritizes when you miss a session, so you never fall behind.",
    tag: "Scheduling",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    icon: BarChart3,
    title: "Progress Analytics",
    description:
      "Deep learning analytics that track not just completion but true understanding. Visualize retention curves, mastery progression, and predicted exam readiness across every subject.",
    tag: "Insights",
    gradient: "from-indigo-500 to-violet-500",
  },
  {
    icon: BookOpen,
    title: "Content Library",
    description:
      "Curated, exam-aligned study materials including video lectures, solved examples, and concept notes. Everything is indexed and instantly searchable by topic or difficulty.",
    tag: "Resources",
    gradient: "from-sky-500 to-blue-500",
  },
  {
    icon: ListChecks,
    title: "Curriculum Tracker",
    description:
      "Complete syllabus coverage tracking for JEE, NEET, and UPSC. See exactly what percentage of your curriculum you've mastered and what still needs attention — chapter by chapter.",
    tag: "Tracking",
    gradient: "from-fuchsia-500 to-pink-500",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-32 bg-slate-50">
      {/* Subtle top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-400/10 rounded-full blur-[120px]" />

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-20">
          <Badge
            variant="outline"
            className="mb-4 px-4 py-1.5 border-blue-300 text-blue-600 bg-blue-50 rounded-full"
          >
            Powerful Features
          </Badge>
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Everything You Need to
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              Dominate Your Exam
            </span>
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Eight AI-powered modules working in harmony to eliminate forgetting, maximize
            understanding, and accelerate your preparation.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <Card
              key={f.title}
              className="group relative bg-white border-gray-200 hover:bg-blue-50/50 hover:border-blue-200 transition-all duration-500 overflow-hidden rounded-2xl shadow-sm hover:shadow-md"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* Hover glow */}
              <div
                className={`absolute -inset-px rounded-2xl bg-gradient-to-b ${f.gradient} opacity-0 group-hover:opacity-[0.08] transition-opacity duration-500 blur-xl`}
              />

              <CardContent className="relative p-6 flex flex-col gap-4">
                {/* Icon */}
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm`}
                  style={{
                    background: `linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.06))`,
                  }}
                >
                  <f.icon className="w-5 h-5 text-blue-600" />
                </div>

                {/* Tag */}
                <span className="text-[11px] font-medium uppercase tracking-widest text-blue-400">
                  {f.tag}
                </span>

                {/* Title */}
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                  {f.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
