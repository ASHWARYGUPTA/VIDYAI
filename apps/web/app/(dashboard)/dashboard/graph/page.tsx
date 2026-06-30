"use client";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { retentionApi } from "@/lib/api/endpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Network } from "lucide-react";
import { ReactFlow, Controls, Background, Handle, Position, Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

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
  mastered:  { color: "bg-green-500",  bg: "bg-green-50 border-green-200",  label: "Mastered"  },
  reviewing: { color: "bg-blue-500",   bg: "bg-blue-50 border-blue-200",    label: "Reviewing" },
  learning:  { color: "bg-yellow-400", bg: "bg-yellow-50 border-yellow-200", label: "Learning" },
  forgotten: { color: "bg-red-500",    bg: "bg-red-50 border-red-200",      label: "Forgotten" },
  unseen:    { color: "bg-gray-300",   bg: "border-gray-200 bg-white",      label: "Unseen"    },
};

// Custom Node for React Flow
function ConceptNodeComponent({ data }: { data: any }) {
  const concept = data.concept as Concept;
  const state = MASTERY_CONFIG[concept.mastery_state] ?? MASTERY_CONFIG.unseen;
  return (
    <div 
      onClick={() => data.onClick(concept)}
      className={`px-3 py-2 min-w-[120px] rounded-lg border-2 shadow-sm cursor-pointer transition-all hover:scale-105 ${state.bg}`}
      title={concept.concepts?.name ?? concept.concept_id}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div className="flex flex-col items-center gap-1.5">
        <div className={`h-3 w-3 rounded-full ${state.color} ${concept.mastery_state === 'learning' || concept.mastery_state === 'reviewing' ? 'animate-pulse' : ''}`} />
        <span className="text-[10px] font-semibold text-gray-800 line-clamp-2 max-w-[100px] text-center leading-tight">
          {concept.concepts?.name ?? "Concept"}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

const nodeTypes = { customConcept: ConceptNodeComponent };

export default function GraphPage() {
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [activeSubject, setActiveSubject] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["knowledge-graph"],
    queryFn: () => retentionApi.knowledgeGraph(),
  });

  const concepts: Concept[] = (data as { concepts?: Concept[] })?.concepts ?? [];
  const summary = (data as { summary?: Record<string, number> })?.summary ?? {};
  
  const bySubject = useMemo(() => {
    const res: Record<string, { name: string; concepts: Concept[] }> = {};
    for (const c of concepts) {
      const sid = c.concepts?.subject_id ?? "unknown";
      const sname = c.concepts?.subjects?.name ?? sid;
      if (!res[sid]) res[sid] = { name: sname, concepts: [] };
      res[sid].concepts.push(c);
    }
    return res;
  }, [concepts]);

  const subjects = Object.entries(bySubject);

  const { nodes, edges } = useMemo(() => {
    const rfNodes: Node[] = [];
    const rfEdges: Edge[] = [];
    let xOffset = 0;
    
    const subjectsToRender = activeSubject === "all" ? subjects : subjects.filter(([sid]) => sid === activeSubject);

    for (const [sid, { name, concepts: subConcepts }] of subjectsToRender) {
      let y = 0;
      let x = xOffset;
      
      rfNodes.push({
        id: `subject-${sid}`,
        type: 'default',
        position: { x: x + 150, y: y - 80 },
        data: { label: name.toUpperCase() },
        style: { fontWeight: 'bold', fontSize: 14, backgroundColor: 'transparent', border: 'none', color: '#64748b' }
      });
      
      subConcepts.forEach((c, idx) => {
        const row = Math.floor(idx / 3);
        const col = idx % 3;
        
        rfNodes.push({
          id: c.concept_id,
          type: 'customConcept',
          position: { x: x + col * 160, y: y + row * 100 },
          data: { concept: c, onClick: (c: Concept) => setSelectedConcept(c) },
        });
        
        if (row > 0) {
          const parentIdx = (row - 1) * 3 + Math.min(col, Math.max(0, subConcepts.length - 1 - (row - 1)*3));
          const parentId = subConcepts[parentIdx]?.concept_id;
          if (parentId) {
            rfEdges.push({
              id: `e-${parentId}-${c.concept_id}`,
              source: parentId,
              target: c.concept_id,
              animated: c.mastery_state === 'learning' || c.mastery_state === 'reviewing',
              style: { stroke: '#94a3b8', strokeWidth: 2 }
            });
          }
        }
      });
      
      xOffset += Math.max(500, (Math.min(3, subConcepts.length) * 160) + 100);
    }
    
    return { nodes: rfNodes, edges: rfEdges };
  }, [subjects, activeSubject]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-2.5 shadow-lg shadow-blue-500/20">
          <Network className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Knowledge Graph</h1>
          <p className="text-sm text-gray-500">Your concept mastery at a glance</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-[600px] rounded-xl" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(["mastered", "reviewing", "learning", "forgotten"] as MasteryState[]).map((state) => {
              const cfg = MASTERY_CONFIG[state];
              return (
                <Card key={state} className={`${cfg.bg} card-hover`}>
                  <CardContent className="pt-4">
                    <p className="text-2xl font-bold text-gray-900">{summary[state] ?? 0}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className={`h-2 w-2 rounded-full ${cfg.color}`} />
                      <p className="text-xs text-gray-600">{cfg.label}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="border-blue-100/50 bg-white flex flex-col h-[700px]">
            <CardHeader className="flex-none">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm text-gray-800">Skill Tree Map</CardTitle>
                  <p className="text-xs text-gray-500">Drag to pan, scroll to zoom. Click nodes for details.</p>
                </div>
                <Tabs value={activeSubject} onValueChange={setActiveSubject}>
                  <TabsList className="bg-gray-50/50 border border-blue-100/60">
                    <TabsTrigger value="all">All</TabsTrigger>
                    {subjects.map(([sid, { name }]) => (
                      <TabsTrigger key={sid} value={sid}>{name}</TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 relative">
              <div className="absolute inset-0 bg-slate-50/50 rounded-b-xl overflow-hidden">
                <ReactFlow 
                  nodes={nodes} 
                  edges={edges} 
                  nodeTypes={nodeTypes}
                  fitView 
                  minZoom={0.1}
                  maxZoom={1.5}
                  attributionPosition="bottom-right"
                >
                  <Background color="#94a3b8" gap={16} />
                  <Controls />
                </ReactFlow>
              </div>
            </CardContent>
          </Card>
        </>
      )}

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
                  <Badge variant="outline" className="border-blue-200">{MASTERY_CONFIG[selectedConcept.mastery_state]?.label}</Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Mastery Score</p>
                  <Progress value={Math.round((selectedConcept.mastery_score ?? 0) * 100)} />
                  <p className="text-sm mt-1 text-gray-800">{Math.round((selectedConcept.mastery_score ?? 0) * 100)}%</p>
                </div>
                {selectedConcept.next_review_date && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Next Review</p>
                    <p className="text-sm font-medium text-gray-800">
                      {new Date(selectedConcept.next_review_date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                  </div>
                )}
                {selectedConcept.concepts?.subjects?.name && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Subject</p>
                    <p className="text-sm text-gray-800">{selectedConcept.concepts.subjects.name}</p>
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
