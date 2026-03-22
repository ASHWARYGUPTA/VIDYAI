"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { plannerApi } from "@/lib/api/endpoints";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Slot {
  id?: string;
  subject?: string;
  topic?: string;
  duration_minutes: number;
  is_completed?: boolean;
  status?: string;
  xp_awarded?: number;
  type?: string;
}

function SlotCard({ slot, onComplete }: { slot: Slot; onComplete: () => void }) {
  const done = slot.is_completed || slot.status === "completed";
  return (
    <div className={`flex items-center gap-4 rounded-lg border p-4 transition-opacity ${done ? "opacity-60" : ""}`}>
      <button
        onClick={() => !done && onComplete()}
        className={`shrink-0 rounded-full border-2 h-6 w-6 flex items-center justify-center transition-colors ${
          done ? "border-green-500 bg-green-500" : "border-muted-foreground hover:border-primary"
        }`}
      >
        {done && <CheckCircle2 className="h-4 w-4 text-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{slot.subject ?? "Study"}</p>
        <p className="text-xs text-muted-foreground truncate">{slot.type}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {slot.xp_awarded ? (
          <Badge variant="secondary" className="text-xs">+{slot.xp_awarded} XP</Badge>
        ) : null}
        <Badge variant="outline" className="text-xs">{slot.duration_minutes}m</Badge>
      </div>
    </div>
  );
}

export default function PlannerPage() {
  const qc = useQueryClient();

  const { data: today, isLoading: todayLoading } = useQuery({
    queryKey: ["plan-today"],
    queryFn: () => plannerApi.today(),
  });

  const { data: week, isLoading: weekLoading } = useQuery({
    queryKey: ["plan-week"],
    queryFn: () => plannerApi.week(),
  });

  const generateMutation = useMutation({
    mutationFn: () => plannerApi.generate({ force_regenerate: true }),
    onSuccess: () => {
      toast.success("New plan generated!");
      qc.invalidateQueries({ queryKey: ["plan-today"] });
      qc.invalidateQueries({ queryKey: ["plan-week"] });
    },
    onError: () => toast.error("Failed to generate plan"),
  });

  const completeMutation = useMutation({
    mutationFn: (slotIndex: number) => plannerApi.completeSlot(slotIndex),
    onSuccess: () => {
      toast.success("+20 XP earned!");
      qc.invalidateQueries({ queryKey: ["plan-today"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Failed to mark complete"),
  });

  const todaySlots = (today as { plan?: { slots?: Slot[] } })?.plan?.slots ?? [];
  const completedToday = todaySlots.filter((s: Slot) => s.is_completed || s.status === "completed").length;
  const totalToday = todaySlots.length;
  const pct = totalToday ? Math.round((completedToday / totalToday) * 100) : 0;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Study Planner</h1>
          <p className="text-sm text-muted-foreground">AI-generated daily schedule</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${generateMutation.isPending ? "animate-spin" : ""}`} />
          Regenerate
        </Button>
      </div>

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">This Week</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4 mt-4">
          {todayLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)
          ) : todaySlots.length ? (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{completedToday}/{totalToday} done</span>
                </div>
                <Progress value={pct} />
              </div>
              {todaySlots.map((slot: Slot, i: number) => (
                <SlotCard key={slot.id ?? i} slot={slot} onComplete={() => completeMutation.mutate(i)} />
              ))}
            </>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center space-y-4">
                <p className="text-muted-foreground">No plan for today yet.</p>
                <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                  {generateMutation.isPending ? "Generating…" : "Generate today's plan"}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="week" className="mt-4">
          {weekLoading ? (
            <Skeleton className="h-64" />
          ) : week?.days?.length ? (
            <div className="space-y-4">
              {(week.days as { plan_date: string; slots: Slot[]; completion_percent?: number }[]).map((day) => {
                const slots = day.slots ?? [];
                const doneCnt = slots.filter((s) => s.is_completed || s.status === "completed").length;
                const totalMin = slots.reduce((acc, s) => acc + (s.duration_minutes ?? 0), 0);
                return (
                  <Card key={day.plan_date}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <CardTitle className="text-sm font-medium">
                          {new Date(day.plan_date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
                        </CardTitle>
                        <span className="text-xs text-muted-foreground">{doneCnt}/{slots.length} • {totalMin}m</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {slots.map((slot: Slot, si: number) => (
                        <div key={si} className="flex items-center gap-2 text-sm">
                          <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${(slot.is_completed || slot.status === "completed") ? "bg-green-500" : "bg-muted-foreground"}`} />
                          <span className="text-muted-foreground truncate">{slot.subject} — {slot.type}</span>
                          <Badge variant="outline" className="text-xs ml-auto shrink-0">{slot.duration_minutes}m</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No weekly plan available.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
