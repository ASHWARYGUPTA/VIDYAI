"use client";

import { useEffect, useRef, useState } from "react";

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 2000;
          const steps = 60;
          const increment = target / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <div ref={ref} className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 tabular-nums">
      {count.toLocaleString()}
      {suffix}
    </div>
  );
}

const stats = [
  { value: 95, suffix: "%", label: "Average Retention Rate", description: "vs 23% with traditional methods" },
  { value: 10000, suffix: "+", label: "Concepts Mapped", description: "across JEE, NEET & UPSC" },
  { value: 500, suffix: "+", label: "Hours Saved", description: "per student per year" },
  { value: 3, suffix: "x", label: "Faster Revision", description: "with spaced repetition AI" },
];

export function StatsSection() {
  return (
    <section className="relative py-28 bg-gradient-to-b from-slate-50 to-blue-50 overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-400/10 rounded-full blur-[150px]" />

      <div className="relative max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {stats.map((s) => (
            <div
              key={s.label}
              className="text-center flex flex-col items-center gap-2 p-6 rounded-2xl bg-white border border-blue-100 hover:bg-blue-50/50 hover:border-blue-200 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <AnimatedCounter target={s.value} suffix={s.suffix} />
              <div className="text-sm font-medium text-gray-800 mt-2">{s.label}</div>
              <div className="text-xs text-gray-500">{s.description}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
