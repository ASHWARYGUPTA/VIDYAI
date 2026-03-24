"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { partnerApi } from "@/lib/api/partner-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const PERIOD_OPTIONS = [
  { label: "7d",  days: 7  },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

const PIE_COLORS = [
  "hsl(var(--primary))",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function UsagePage() {
  const [days, setDays] = useState(30);

  const { data, isLoading } = useQuery({
    queryKey: ["partner-usage", days],
    queryFn: () => partnerApi.usage(daysAgo(days)),
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Usage Analytics</h1>
        <div className="flex gap-1 rounded-lg border bg-card p-1">
          {PERIOD_OPTIONS.map((o) => (
            <button
              key={o.days}
              onClick={() => setDays(o.days)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                days === o.days
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="py-5">
              <p className="text-sm text-muted-foreground">Total Calls</p>
              <p className="text-3xl font-bold mt-1">{(data?.total_calls ?? 0).toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-5">
              <p className="text-sm text-muted-foreground">Tokens Used</p>
              <p className="text-3xl font-bold mt-1">
                {((data?.tokens_used ?? 0) / 1000).toFixed(1)}<span className="text-xl font-normal text-muted-foreground">K</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-5">
              <p className="text-sm text-muted-foreground">Avg / Day</p>
              <p className="text-3xl font-bold mt-1">
                {data?.by_day?.length
                  ? Math.round((data.total_calls ?? 0) / data.by_day.length).toLocaleString()
                  : "0"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily calls bar chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Calls per Day</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-52" />
            ) : (data?.by_day?.length ?? 0) === 0 ? (
              <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
                No usage in this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={data?.by_day} margin={{ left: -20 }}>
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
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4,4,0,0]} name="Calls" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Feature pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By Feature</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-52" />
            ) : (data?.by_tool?.length ?? 0) === 0 ? (
              <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
                No data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie
                    data={data?.by_tool}
                    dataKey="count"
                    nameKey="tool"
                    cx="50%"
                    cy="45%"
                    outerRadius={70}
                    innerRadius={35}
                  >
                    {data?.by_tool?.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend
                    formatter={(value) => (
                      <span className="text-xs capitalize">{(value as string).replace("_", " ")}</span>
                    )}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tool table */}
      {!isLoading && (data?.by_tool?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Feature Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground">Feature</th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">Calls</th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {data?.by_tool?.sort((a,b) => b.count - a.count).map(({ tool, count }) => {
                  const pct = Math.round((count / (data.total_calls || 1)) * 100);
                  return (
                    <tr key={tool} className="border-b last:border-0">
                      <td className="py-2.5 capitalize font-medium">{tool.replace("_", " ")}</td>
                      <td className="py-2.5 text-right tabular-nums">{count.toLocaleString()}</td>
                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-muted-foreground w-8">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
