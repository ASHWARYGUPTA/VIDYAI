"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Menu, X, GraduationCap } from "lucide-react";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Testimonials", href: "#testimonials" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/80 backdrop-blur-xl border-b border-blue-100 shadow-lg shadow-blue-900/5"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-shadow">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-400 opacity-0 group-hover:opacity-30 blur-md transition-opacity" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-blue-600 bg-clip-text text-transparent">
            VidyAI
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-gray-600 hover:text-blue-600 transition-colors relative group"
            >
              {l.label}
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-gradient-to-r from-blue-500 to-blue-400 group-hover:w-full transition-all duration-300" />
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="http://localhost:3001"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 hover:text-blue-600 transition-colors px-2"
          >
            For Partners
          </a>
          <Link href="/login">
            <Button
              variant="ghost"
              className="text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-full px-5"
            >
              Log in
            </Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-full px-6 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all">
              Get Started Free
            </Button>
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-gray-700 p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-2xl border-t border-blue-100 animate-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col px-6 py-6 gap-4">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="text-gray-600 hover:text-blue-600 py-2 transition-colors"
              >
                {l.label}
              </a>
            ))}
            <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-blue-100">
              <a
                href="http://localhost:3001"
                target="_blank"
                rel="noopener noreferrer"
                className="text-center text-sm text-gray-500 hover:text-blue-600 py-1"
              >
                For Partners →
              </a>
              <Link href="/login">
                <Button variant="ghost" className="w-full text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-full">
                  Log in
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-full shadow-lg shadow-blue-500/25">
                  Get Started Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
