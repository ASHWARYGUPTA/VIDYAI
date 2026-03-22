"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { retentionApi } from "@/lib/api/endpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Network } from "lucide-react";

type MasteryState = "mastered" | "reviewing" | "learning" | "forgotten" | "unseen";

interface Concept {
  concept_id: string;
  mastery_state: MasteryState;
  mastery_score: number;
  next_review_date?: string;
  concepts?: {
    name: string;
    subject_id?: string;
    description?: string;
    subjects?: { name: string };
  };
}

interface SubjectRetention {
  subject_id: string;
  subject_name: string;
  retention_index: number;
  concept_count: number;
}

const MASTERY_CONFIG: Record<MasteryState, { color: string; bg: string; label: string }> = {
  mastered:  { color: "bg-green-500",  bg: "bg-green-50 dark:bg-green-950/20",  label: "Mastered"  },
  reviewing: { color: "bg-blue-500",   bg: "bg-blue-50 dark:bg-blue-950/20",    label: "Reviewing" },
  learning:  { color: "bg-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-950/20", label: "Learning" },
  forgotten: { color: "bg-red-500",    bg: "bg-red-50 dark:bg-red-950/20",      label: "Forgotten" },
  unseen:    { color: "bg-muted-foreground/40", bg: "", label: "Unseen" },
};

function ConceptNode({ concept, onClick }: { concept: Concept; onClick: () => void }) {
  const state = MASTERY_CONFIG[concept.mastery_state] ?? MASTERY_CONFIG.unseen;
  return (
    <button
      onClick={onClick}
      title={concept.concepts?.name ?? concept.concept_id}
      className={`h-4 w-4 rounded-full ${state.color} hover:scale-125 transition-transform cursor-pointer shrink-0`}
    />
  );
}

export default function GraphPage() {
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [activeSubject, setActiveSubject] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["knowledge-graph", activeSubject],
    queryFn: () => retentionApi.knowledgeGraph(activeSubject === "all" ? undefined : activeSubject),
  });

  const concepts: Concept[] = (data as { concepts?: Concept[] })?.concepts ?? [];
  const summary = (data as { summary?: Record<string, number> })?.summary ?? {};
  const subjectRetention: SubjectRetention[] = (data as { subject_retention_index?: SubjectRetention[] })?.subject_retention_index ?? [];

  // Group concepts by subject
  const bySubject: Record<string, { name: string; concepts: Concept[] }> = {};
  for (const c of concepts) {
    const sid = c.concepts?.subject_id ?? "unknown";
    const sname = c.concepts?.subjects?.name ?? sid;
    if (!bySubject[sid]) bySubject[sid] = { name: sname, concepts: [] };
    bySubject[sid].concepts.push(c);
  }

  const subjects = Object.entries(bySubject);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Network className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-xl font-semibold">Knowledge Graph</h1>
          <p className="text-sm text-muted-foreground">Your concept mastery at a glance</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          {/* Summary stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(["mastered", "reviewing", "learning", "forgotten"] as MasteryState[]).map((state) => {
              const cfg = MASTERY_CONFIG[state];
              return (
                <Card key={state} className={cfg.bg}>
                  <CardContent className="pt-4">
                    <p className="text-2xl font-bold">{summary[state] ?? 0}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className={`h-2 w-2 rounded-full ${cfg.color}`} />
                      <p className="text-xs text-muted-foreground">{cfg.label}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Subject retention index */}
          {subjectRetention.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Subject Retention Index</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {subjectRetention.sort((a, b) => b.retention_index - a.retention_index).map((s) => (
                  <div key={s.subject_id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{s.subject_name}</span>
                      <span className="text-muted-foreground">{s.retention_index}% · {s.concept_count} concepts</span>
                    </div>
                    <Progress
                      value={s.retention_index}
                      className={s.retention_index >= 75 ? "text-green-500" : s.retention_index >= 50 ? "text-yellow-500" : "text-red-500"}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Concept node grid — filter by subject */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Concept Nodes</CardTitle>
              <p className="text-xs text-muted-foreground">Click a dot to inspect a concept</p>
            </CardHeader>
            <CardContent>
              <Tabs value={activeSubject} onValueChange={setActiveSubject}>
                <TabsList className="flex-wrap h-auto mb-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  {subjects.map(([sid, { name }]) => (
                    <TabsTrigger key={sid} value={sid}>{name}</TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value={activeSubject}>
                  <div className="space-y-4">
                    {(activeSubject === "all" ? subjects : subjects.filter(([sid]) => sid === activeSubject)).map(([sid, { name, concepts: subConcepts }]) => (
                      <div key={sid}>
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{name}</p>
                        <div className="flex flex-wrap gap-2">
                          {subConcepts.map((c) => (
                            <ConceptNode key={c.concept_id} concept={c} onClick={() => setSelectedConcept(c)} />
                          ))}
                        </div>
                      </div>
                    ))}
                    {concepts.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">No concepts tracked yet. Start reviewing flashcards!</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t text-xs text-muted-foreground">
                {(Object.entries(MASTERY_CONFIG) as [MasteryState, typeof MASTERY_CONFIG[MasteryState]][]).map(([state, cfg]) => (
                  <div key={state} className="flex items-center gap-1.5">
                    <div className={`h-3 w-3 rounded-full ${cfg.color}`} />
                    {cfg.label}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Concept detail slide-out */}
      <Sheet open={!!selectedConcept} onOpenChange={(open) => !open && setSelectedConcept(null)}>
        <SheetContent>
          {selectedConcept && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedConcept.concepts?.name ?? "Concept"}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${MASTERY_CONFIG[selectedConcept.mastery_state]?.color}`} />
                  <Badge variant="outline">{MASTERY_CONFIG[selectedConcept.mastery_state]?.label}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Mastery Score</p>
                  <Progress value={Math.round((selectedConcept.mastery_score ?? 0) * 100)} />
                  <p className="text-sm mt-1">{Math.round((selectedConcept.mastery_score ?? 0) * 100)}%</p>
                </div>
                {selectedConcept.next_review_date && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Next Review</p>
                    <p className="text-sm font-medium">
                      {new Date(selectedConcept.next_review_date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                  </div>
                )}
                {selectedConcept.concepts?.subjects?.name && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Subject</p>
                    <p className="text-sm">{selectedConcept.concepts.subjects.name}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
