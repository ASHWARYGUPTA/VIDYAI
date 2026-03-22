"use client";
import { useQuery } from "@tanstack/react-query";
import { progressApi } from "@/lib/api/endpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

// Retention score bands: 0=no activity, 0-0.25=critical, 0.25-0.5=weak, 0.5-0.75=moderate, 0.75+=strong
function retentionClass(score: number, hasActivity: boolean) {
  if (!hasActivity) return "bg-muted";
  if (score >= 0.75) return "bg-green-500";
  if (score >= 0.50) return "bg-yellow-400";
  if (score >= 0.25) return "bg-orange-400";
  return "bg-red-400";
}

function retentionLabel(score: number, hasActivity: boolean) {
  if (!hasActivity) return "No activity";
  if (score >= 0.75) return "Strong";
  if (score >= 0.50) return "Moderate";
  if (score >= 0.25) return "Weak";
  return "Critical";
}

export default function ProgressPage() {
  const { data: dash, isLoading: dashLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => progressApi.dashboard(),
  });

  const { data: heatmap, isLoading: heatLoading } = useQuery({
    queryKey: ["heatmap"],
    queryFn: () => progressApi.heatmap(),
  });

  const { data: weekly, isLoading: weekLoading } = useQuery({
    queryKey: ["weekly-progress"],
    queryFn: () => progressApi.weekly(),
  });

  const { data: xpData, isLoading: xpLoading } = useQuery({
    queryKey: ["xp"],
    queryFn: () => progressApi.xp(),
  });

  if (dashLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  const masteryDist = (dash as { knowledge_summary?: Record<string, number> })?.knowledge_summary ?? {};

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Progress</h1>
        <p className="text-sm text-muted-foreground">Your learning journey at a glance</p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="xp">XP &amp; Badges</TabsTrigger>
          <TabsTrigger value="heatmap">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-6">
          {/* Mastery summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { key: "mastered", label: "Mastered", color: "text-green-600" },
              { key: "learning", label: "Learning", color: "text-blue-600" },
              { key: "weak", label: "Weak", color: "text-red-500" },
              { key: "new", label: "New", color: "text-muted-foreground" },
            ].map(({ key, label, color }) => (
              <Card key={key}>
                <CardContent className="pt-6">
                  <p className="text-2xl font-bold">{masteryDist[key] ?? 0}</p>
                  <p className={`text-sm ${color}`}>{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Weekly chart */}
          <Card>
            <CardHeader><CardTitle className="text-base">Weekly Performance</CardTitle></CardHeader>
            <CardContent>
              {weekLoading ? <Skeleton className="h-48" /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weekly?.weeks ?? []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="week_start" tick={{ fontSize: 12 }} tickFormatter={(v) => v?.slice(5)} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    />
                    <Bar dataKey="xp_earned" name="XP" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="xp" className="mt-4 space-y-6">
          {xpLoading ? <Skeleton className="h-32" /> : (
            <>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-3xl font-bold">{xpData?.total_xp ?? 0} XP</p>
                      <p className="text-sm text-muted-foreground">Level {xpData?.level ?? 1}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Next level</p>
                      <p className="font-medium">{xpData?.next_level_xp ?? 500} XP</p>
                    </div>
                  </div>
                  <Progress value={Math.min(100, ((xpData?.total_xp ?? 0) / (xpData?.next_level_xp ?? 500)) * 100)} />
                </CardContent>
              </Card>

              {xpData?.badges?.length ? (
                <div>
                  <h2 className="text-sm font-semibold mb-3">Badges Earned</h2>
                  <div className="flex flex-wrap gap-2">
                    {xpData.badges.map((b: { id: string; name: string; description: string }) => (
                      <Badge key={b.id} className="gap-1 py-1 px-3">
                        {b.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <h2 className="text-sm font-semibold mb-3">XP History</h2>
                <div className="space-y-2">
                  {((xpData?.ledger ?? []) as { activity_date: string; xp_earned: number; study_minutes: number }[]).slice(0, 14).map((entry) => (
                    <div key={entry.activity_date} className="flex items-center gap-3 rounded-lg border p-3">
                      <div className="flex-1">
                        <p className="text-sm">{new Date(entry.activity_date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</p>
                        <p className="text-xs text-muted-foreground">{entry.study_minutes}m studied</p>
                      </div>
                      <Badge variant="secondary">+{entry.xp_earned} XP</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="heatmap" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Retention Heatmap</CardTitle>
              <p className="text-xs text-muted-foreground">Color = avg retention score on that day</p>
            </CardHeader>
            <CardContent>
              {heatLoading ? <Skeleton className="h-32" /> : (
                <div className="overflow-x-auto">
                  <div className="flex gap-1 flex-wrap">
                    {((heatmap?.days ?? []) as { activity_date: string; xp_earned: number; study_minutes: number; cards_reviewed: number; avg_retention_score: number }[]).map((day) => {
                      const hasActivity = (day.xp_earned ?? 0) > 0 || (day.cards_reviewed ?? 0) > 0;
                      const score = day.avg_retention_score ?? 0;
                      return (
                        <div
                          key={day.activity_date}
                          title={`${day.activity_date}: ${retentionLabel(score, hasActivity)} (${Math.round(score * 100)}% retention) · ${day.xp_earned ?? 0} XP · ${day.study_minutes ?? 0}m`}
                          className={`h-4 w-4 rounded-sm cursor-default ${retentionClass(score, hasActivity)}`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground flex-wrap">
                    <span>Retention:</span>
                    {[
                      { cls: "bg-muted", label: "No activity" },
                      { cls: "bg-red-400", label: "Critical (<25%)" },
                      { cls: "bg-orange-400", label: "Weak (25–50%)" },
                      { cls: "bg-yellow-400", label: "Moderate (50–75%)" },
                      { cls: "bg-green-500", label: "Strong (75%+)" },
                    ].map(({ cls, label }) => (
                      <div key={label} className="flex items-center gap-1">
                        <div className={`h-3 w-3 rounded-sm ${cls}`} />
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
