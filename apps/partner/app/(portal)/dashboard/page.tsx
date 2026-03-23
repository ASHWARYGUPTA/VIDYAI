"use client";
import { useQuery } from "@tanstack/react-query";
import { partnerApi } from "@/lib/api/partner-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Activity, Users, Zap, TrendingUp } from "lucide-react";

export default function PartnerDashboard() {
  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ["partner-usage"],
    queryFn: () => partnerApi.usage(),
  });

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ["partner-students", 1],
    queryFn: () => partnerApi.students(1, 0),
  });

  const { data: keys } = useQuery({
    queryKey: ["partner-keys"],
    queryFn: () => partnerApi.keys.list(),
  });

  const isLoading = usageLoading || studentsLoading;

  const topTool = usage?.by_tool?.sort((a, b) => b.count - a.count)[0];
  const todayCalls = usage?.by_day?.at(-1)?.count ?? 0;

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const stats = [
    {
      label: "Total API Calls",
      value: (usage?.total_calls ?? 0).toLocaleString(),
      icon: Activity,
      sub: `${todayCalls} today`,
    },
    {
      label: "Active Students",
      value: (students?.total ?? 0).toLocaleString(),
      icon: Users,
      sub: "across all keys",
    },
    {
      label: "Tokens Used",
      value: ((usage?.tokens_used ?? 0) / 1000).toFixed(1) + "K",
      icon: Zap,
      sub: "this period",
    },
    {
      label: "Top Feature",
      value: topTool?.tool ?? "—",
      icon: TrendingUp,
      sub: topTool ? `${topTool.count} calls` : "no data yet",
    },
  ];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Badge variant="secondary">{keys?.keys?.filter(k => k.is_active).length ?? 0} active keys</Badge>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, sub }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Calls per day chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">API Calls — Last 30 Days</CardTitle>
        </CardHeader>
        <CardContent>
          {(usage?.by_day?.length ?? 0) === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              No usage data yet. Make your first API call to see analytics.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={usage?.by_day ?? []} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(d) => d.slice(5)}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Calls" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Tool breakdown */}
      {(usage?.by_tool?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Calls by Feature</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {usage?.by_tool?.sort((a, b) => b.count - a.count).map(({ tool, count }) => {
              const pct = Math.round((count / (usage.total_calls || 1)) * 100);
              return (
                <div key={tool} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium capitalize">{tool.replace("_", " ")}</span>
                    <span className="text-muted-foreground">{count.toLocaleString()} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
