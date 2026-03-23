"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";

export function CTASection() {
  return (
    <section className="relative py-32 bg-gradient-to-b from-blue-50 to-white overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-300/10 rounded-full blur-[150px]" />

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        {/* Glow card */}
        <div className="relative p-12 sm:p-16 rounded-3xl bg-gradient-to-b from-blue-600 to-blue-700 border border-blue-500 overflow-hidden">
          {/* Inner glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-blue-400/20 rounded-full blur-[100px]" />

          <div className="relative">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 border border-white/20 mb-8">
              <Zap className="w-7 h-7 text-white" />
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight">
              <span className="text-white">
                Ready to Never
              </span>
              <br />
              <span className="text-blue-100">
                Forget Again?
              </span>
            </h2>

            <p className="text-blue-100 text-lg max-w-xl mx-auto mb-10">
              Join thousands of JEE, NEET, and UPSC aspirants who are studying smarter — not
              harder — with AI-powered retention technology.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="bg-white text-blue-700 hover:bg-blue-50 rounded-full px-10 h-14 text-base shadow-2xl shadow-black/20 hover:shadow-black/30 transition-all hover:scale-105 group font-semibold"
                >
                  Start Free — No Credit Card
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>

            <p className="text-xs text-blue-200 mt-6">
              Free forever plan available  •  No credit card required  •  Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
