"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const linkGroups = [
  {
    heading: "Product",
    links: [
      { label: "AI Tutor", href: "#features" },
      { label: "Smart Revision", href: "#features" },
      { label: "Knowledge Graph", href: "#features" },
      { label: "Adaptive Tests", href: "#features" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Study Planner", href: "#features" },
      { label: "Content Library", href: "#features" },
      { label: "Progress Analytics", href: "#features" },
      { label: "Curriculum Tracker", href: "#features" },
    ],
  },
  {
    heading: "Exams",
    links: [
      { label: "JEE Mains & Advanced", href: "#" },
      { label: "NEET UG", href: "#" },
      { label: "UPSC CSE", href: "#" },
      { label: "Board Exams", href: "#" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About Us", href: "#" },
      { label: "Contact", href: "#" },
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative bg-slate-50 pt-16 pb-8 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">VidyAI</span>
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed">
              AI-powered retention-first learning for India&rsquo;s most competitive exams.
            </p>
          </div>

          {/* Link groups */}
          {linkGroups.map((g) => (
            <div key={g.heading}>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">{g.heading}</h4>
              <ul className="space-y-2.5">
                {g.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="bg-gray-200" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8">
          <p className="text-sm text-gray-600">
            © {new Date().getFullYear()} VidyAI. All rights reserved.
          </p>
          <p className="text-sm text-gray-600">
            Made with 💜 for Indian students
          </p>
        </div>
      </div>
    </footer>
  );
}
