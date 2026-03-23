"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, CheckCircle2, AlertTriangle, X, Calendar } from "lucide-react";
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
    <div className={`flex items-center gap-4 rounded-xl border p-4 transition-all ${done ? "opacity-60 bg-green-50/50 border-green-200" : "border-gray-200 hover:border-blue-200 hover:bg-blue-50/30"}`}>
      <button
        onClick={() => !done && onComplete()}
        className={`shrink-0 rounded-full border-2 h-6 w-6 flex items-center justify-center transition-all ${
          done ? "border-green-500 bg-green-500 shadow-sm shadow-green-500/20" : "border-gray-300 hover:border-blue-500"
        }`}
      >
        {done && <CheckCircle2 className="h-4 w-4 text-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm ${done ? "line-through text-gray-400" : "text-gray-800"}`}>{slot.subject ?? "Study"}</p>
        <p className="text-xs text-gray-400 truncate">{slot.type}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {slot.xp_awarded ? (
          <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-600 border-blue-200">+{slot.xp_awarded} XP</Badge>
        ) : null}
        <Badge variant="outline" className="text-xs border-blue-200 text-blue-600">{slot.duration_minutes}m</Badge>
      </div>
    </div>
  );
}

interface RebalanceAlert {
  subject: string;
  current_retention: number;
  prev_retention: number;
  dip_pct: number;
}

export default function PlannerPage() {
  const qc = useQueryClient();
  const [alertsDismissed, setAlertsDismissed] = useState(false);

  const { data: today, isLoading: todayLoading } = useQuery({
    queryKey: ["plan-today"],
    queryFn: () => plannerApi.today(),
  });

  const rebalanceAlerts: RebalanceAlert[] = (today as { rebalance_alerts?: RebalanceAlert[] })?.rebalance_alerts ?? [];
  const wasAutoRebalanced = (today as { was_auto_rebalanced?: boolean })?.was_auto_rebalanced ?? false;

  useEffect(() => {
    if (wasAutoRebalanced) {
      toast.success("Plan auto-updated based on retention dips", { duration: 4000 });
    }
  }, [wasAutoRebalanced]);

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
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-2.5 shadow-lg shadow-blue-500/20">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Study Planner</h1>
            <p className="text-sm text-gray-500">AI-generated daily schedule</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-blue-200 text-blue-600 hover:bg-blue-50"
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${generateMutation.isPending ? "animate-spin" : ""}`} />
          Regenerate
        </Button>
      </div>

      {rebalanceAlerts.length > 0 && !alertsDismissed && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-amber-900">
                  {wasAutoRebalanced ? "Plan rebalanced — retention dips detected" : "Retention dips detected"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {rebalanceAlerts.map((alert) => (
                    <Badge
                      key={alert.subject}
                      variant="outline"
                      className={`text-xs ${alert.dip_pct >= 15 ? "border-red-400 text-red-700" : "border-amber-400 text-amber-700"}`}
                    >
                      {alert.subject} −{alert.dip_pct}%
                      <span className="text-gray-500 ml-1">({Math.round(alert.prev_retention)}→{Math.round(alert.current_retention)})</span>
                    </Badge>
                  ))}
                </div>
                {wasAutoRebalanced && (
                  <p className="text-xs text-amber-700">Revision slots have been added for weak subjects.</p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-amber-600 hover:text-amber-800 hover:bg-amber-100"
              onClick={() => setAlertsDismissed(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Tabs defaultValue="today">
        <TabsList className="bg-white border border-blue-100/60">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">This Week</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4 mt-4">
          {todayLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
          ) : todaySlots.length ? (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Progress</span>
                  <span className="font-medium text-gray-800">{completedToday}/{totalToday} done</span>
                </div>
                <Progress value={pct} />
              </div>
              {todaySlots.map((slot: Slot, i: number) => (
                <SlotCard key={slot.id ?? i} slot={slot} onComplete={() => completeMutation.mutate(i)} />
              ))}
            </>
          ) : (
            <Card className="border-blue-100/50 bg-white">
              <CardContent className="pt-6 text-center space-y-4">
                <Calendar className="h-8 w-8 text-gray-300 mx-auto" />
                <p className="text-gray-400">No plan for today yet.</p>
                <Button
                  className="bg-gradient-to-r from-blue-600 to-blue-500 shadow-md shadow-blue-500/20"
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                >
                  {generateMutation.isPending ? "Generating…" : "Generate today's plan"}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="week" className="mt-4">
          {weekLoading ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : week?.days?.length ? (
            <div className="space-y-4">
              {(week.days as { plan_date: string; slots: Slot[]; completion_percent?: number }[]).map((day) => {
                const slots = day.slots ?? [];
                const doneCnt = slots.filter((s) => s.is_completed || s.status === "completed").length;
                const totalMin = slots.reduce((acc, s) => acc + (s.duration_minutes ?? 0), 0);
                return (
                  <Card key={day.plan_date} className="border-blue-100/50 bg-white">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <CardTitle className="text-sm font-medium text-gray-800">
                          {new Date(day.plan_date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
                        </CardTitle>
                        <span className="text-xs text-gray-500">{doneCnt}/{slots.length} • {totalMin}m</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {slots.map((slot: Slot, si: number) => (
                        <div key={si} className="flex items-center gap-2 text-sm">
                          <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${(slot.is_completed || slot.status === "completed") ? "bg-green-500" : "bg-gray-300"}`} />
                          <span className="text-gray-600 truncate">{slot.subject} — {slot.type}</span>
                          <Badge variant="outline" className="text-xs ml-auto shrink-0 border-blue-200 text-blue-600">{slot.duration_minutes}m</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No weekly plan available.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
