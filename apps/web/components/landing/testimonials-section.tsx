"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Arjun Mehta",
    initials: "AM",
    exam: "JEE Advanced",
    quote:
      "I used to forget 70% of what I studied within a week. VidyAI's spaced repetition changed everything — I retained 95% of my Physics concepts over 3 months. It genuinely feels like a superpower.",
    stars: 5,
  },
  {
    name: "Priya Sharma",
    initials: "PS",
    exam: "NEET",
    quote:
      "The AI tutor explains tough Biology concepts better than most teachers I've had. It asks follow-up questions that force me to think deeper. My NEET mock scores improved by 120 marks in just 2 months.",
    stars: 5,
  },
  {
    name: "Rohit Verma",
    initials: "RV",
    exam: "UPSC CSE",
    quote:
      "The knowledge graph showed me connections between Economics, Governance, and History that I completely missed in my self-study. VidyAI made my answer writing more analytical and interconnected.",
    stars: 5,
  },
  {
    name: "Sneha Iyer",
    initials: "SI",
    exam: "JEE Mains",
    quote:
      "The adaptive tests are scary accurate. They identified my weak spots in Coordinate Geometry that I thought I was good at. After focused revision, I went from 60% to 92% accuracy on those topics.",
    stars: 5,
  },
  {
    name: "Karan Patel",
    initials: "KP",
    exam: "NEET",
    quote:
      "The study planner saved me during my final 3 months. When I missed a day, it automatically rescheduled everything without breaking my plan. Zero panic, maximum efficiency.",
    stars: 5,
  },
  {
    name: "Ananya Gupta",
    initials: "AG",
    exam: "UPSC CSE",
    quote:
      "I've used 5+ UPSC apps. VidyAI is the only one that actually helps me REMEMBER what I read. The combination of flashcards, AI revision, and analytics is unmatched.",
    stars: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="relative py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge
            variant="outline"
            className="mb-4 px-4 py-1.5 border-blue-300 text-blue-600 bg-blue-50 rounded-full"
          >
            Student Stories
          </Badge>
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Loved by Students
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              Across India
            </span>
          </h2>
        </div>

        {/* Testimonial Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <Card
              key={t.name}
              className="bg-white border-gray-200 hover:bg-blue-50/30 hover:border-blue-200 transition-all duration-500 rounded-2xl shadow-sm hover:shadow-md"
            >
              <CardContent className="p-6 flex flex-col gap-4">
                {/* Stars */}
                <div className="flex gap-1">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-sm text-gray-600 leading-relaxed flex-1">
                  &ldquo;{t.quote}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <Avatar className="h-9 w-9 bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200">
                    <AvatarFallback className="bg-transparent text-xs font-medium text-blue-600">
                      {t.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.exam} Aspirant</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
