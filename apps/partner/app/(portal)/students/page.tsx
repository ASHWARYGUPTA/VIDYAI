"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { partnerApi } from "@/lib/api/partner-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 20;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default function StudentsPage() {
  const [page, setPage]     = useState(0);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["partner-students", page],
    queryFn: () => partnerApi.students(PAGE_SIZE, page * PAGE_SIZE),
  });

  const total    = data?.total ?? 0;
  const pages    = Math.ceil(total / PAGE_SIZE);
  const students = data?.students ?? [];

  const filtered = search.trim()
    ? students.filter((s) =>
        s.external_student_id.toLowerCase().includes(search.toLowerCase()),
      )
    : students;

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total.toLocaleString()} students mapped via your API keys
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by student ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Student Mappings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Users className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {search ? "No students match your search" : "No students yet. Students are auto-registered on first embed widget use."}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    External Student ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Exam Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3.5 font-mono font-medium">{s.external_student_id}</td>
                    <td className="px-6 py-3.5">
                      {s.exam_type ? (
                        <Badge variant="secondary">{s.exam_type}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-muted-foreground">
                      {formatDate(s.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {pages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
