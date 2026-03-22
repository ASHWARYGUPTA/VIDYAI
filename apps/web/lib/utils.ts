import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatIST(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

export function formatISTTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

export function masteryColor(state: string): string {
  return {
    mastered: "text-emerald-600 bg-emerald-50",
    reviewing: "text-blue-600 bg-blue-50",
    learning: "text-amber-600 bg-amber-50",
    forgotten: "text-red-600 bg-red-50",
    unseen: "text-gray-500 bg-gray-50",
  }[state] ?? "text-gray-500 bg-gray-50";
}

export function masteryPercent(score: number): number {
  return Math.round(score * 100);
}

export function daysUntil(dateStr: string): number {
  return Math.max(0, Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000));
}
