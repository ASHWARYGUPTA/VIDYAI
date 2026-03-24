"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { syllabusApi, progressApi, plannerApi } from "@/lib/api/endpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, ChevronDown, ChevronRight, CalendarCheck } from "lucide-react";
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
} from "recharts";

interface Subject {
  id: string;
  name: string;
  exam_types?: string[];
}

interface Chapter {
  id: string;
  name: string;
  chapter_number?: number;
  progress?: {
    completion_percent?: number;
    concepts_mastered?: number;
    concepts_seen?: number;
    time_spent_minutes?: number;
  };
}

interface Slot {
  subject?: string;
  chapter_id?: string;
  type?: string;
  duration_minutes?: number;
  status?: string;
  is_completed?: boolean;
}

function SubjectCard({
  subject,
  todaySlots,
}: {
  subject: Subject;
  todaySlots: Slot[];
}) {
  const [expanded, setExpanded] = useState(false);

  const { data: progressData, isLoading: progressLoading } = useQuery({
    queryKey: ["subject-progress", subject.id],
    queryFn: () => progressApi.subject(subject.id),
    enabled: expanded,
  });

  const { data: chaptersData, isLoading: chaptersLoading } = useQuery({
    queryKey: ["chapters", subject.id],
    queryFn: () => syllabusApi.chapters(subject.id),
    enabled: expanded,
  });

  const chapters: Chapter[] = (() => {
    const raw = (chaptersData as { chapters?: unknown[] })?.chapters ?? [];
    const progressChapters: Chapter[] = (progressData as { chapters?: Chapter[] })?.chapters ?? [];
    return progressChapters.length ? progressChapters : (raw as Chapter[]);
  })();

  const todayChapterIds = new Set(
    todaySlots
      .filter((s) => s.subject?.toLowerCase() === subject.name.toLowerCase())
      .map((s) => s.chapter_id)
      .filter(Boolean)
  );

  const avgCompletion = chapters.length
    ? Math.round(
        chapters.reduce((acc, c) => acc + (c.progress?.completion_percent ?? 0), 0) / chapters.length
      )
    : 0;

  const radialData = [{ name: subject.name, value: avgCompletion, fill: avgCompletion >= 75 ? "#22c55e" : avgCompletion >= 40 ? "#2563eb" : "#f97316" }];

  return (
    <Card className="overflow-hidden border-blue-100/50 bg-white card-hover">
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="60%"
                outerRadius="100%"
                data={radialData}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar dataKey="value" cornerRadius={4} background={{ fill: "#eff6ff" }} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm text-gray-800">{subject.name}</CardTitle>
            <p className="text-xs text-gray-500">{avgCompletion}% avg completion</p>
          </div>

          {todaySlots.some((s) => s.subject?.toLowerCase() === subject.name.toLowerCase()) && (
            <Badge variant="secondary" className="shrink-0 text-xs gap-1 bg-blue-50 text-blue-600 border-blue-200">
              <CalendarCheck className="h-3 w-3" />
              In today&apos;s plan
            </Badge>
          )}

          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
          )}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-3">
          {chaptersLoading || progressLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
          ) : chapters.length ? (
            chapters.map((chapter) => {
              const pct = chapter.progress?.completion_percent ?? 0;
              const inPlan = todayChapterIds.has(chapter.id);
              return (
                <div key={chapter.id} className={`rounded-xl border p-3 space-y-2 transition-all ${inPlan ? "border-blue-300 bg-blue-50/50 shadow-sm shadow-blue-500/10" : "border-gray-200 hover:border-blue-200"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium flex-1 min-w-0 truncate text-gray-800">
                      {chapter.chapter_number ? `${chapter.chapter_number}. ` : ""}{chapter.name}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      {inPlan && (
                        <Badge variant="outline" className="text-xs text-blue-600 border-blue-300 gap-1">
                          <CalendarCheck className="h-3 w-3" />
                          Today
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500">{Math.round(pct)}%</span>
                    </div>
                  </div>
                  <Progress value={pct} />
                  {(chapter.progress?.concepts_mastered != null || chapter.progress?.concepts_seen != null) && (
                    <div className="flex gap-3 text-xs text-gray-500">
                      {chapter.progress.concepts_mastered != null && (
                        <span className="text-green-600">{chapter.progress.concepts_mastered} mastered</span>
                      )}
                      {chapter.progress.concepts_seen != null && (
                        <span>{chapter.progress.concepts_seen} seen</span>
                      )}
                      {chapter.progress.time_spent_minutes != null && chapter.progress.time_spent_minutes > 0 && (
                        <span>{chapter.progress.time_spent_minutes}m studied</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No chapters found.</p>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function CurriculumPage() {
  const { data: subjectsData, isLoading: subjectsLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => syllabusApi.subjects(),
  });

  const { data: todayPlan } = useQuery({
    queryKey: ["plan-today"],
    queryFn: () => plannerApi.today(),
  });

  const subjects: Subject[] = (subjectsData as { subjects?: Subject[] })?.subjects ?? [];
  const todaySlots: Slot[] = (todayPlan as { plan?: { slots?: Slot[] } })?.plan?.slots ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-2.5 shadow-lg shadow-blue-500/20">
          <BookOpen className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Curriculum Flow</h1>
          <p className="text-sm text-gray-500">Subject-wise chapter progress · today&apos;s plan highlighted</p>
        </div>
      </div>

      {todaySlots.length > 0 && (
        <Card className="border-blue-300 bg-blue-50/50 shadow-sm shadow-blue-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
              <CalendarCheck className="h-4 w-4" />
              Today&apos;s Study Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {todaySlots.map((slot, i) => {
                const done = slot.is_completed || slot.status === "completed";
                return (
                  <Badge key={i} variant={done ? "default" : "outline"} className={`text-xs gap-1 ${done ? "bg-blue-600" : "border-blue-300 text-blue-700"}`}>
                    {done && <span>✓</span>}
                    {slot.subject} — {slot.type} ({slot.duration_minutes}m)
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {subjectsLoading ? (
        Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
      ) : subjects.length ? (
        <div className="space-y-3">
          {subjects.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} todaySlots={todaySlots} />
          ))}
        </div>
      ) : (
        <Card className="border-blue-100/50 bg-white">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-400">No subjects available. Generate a study plan first.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
