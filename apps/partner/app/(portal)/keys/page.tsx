"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { partnerApi } from "@/lib/api/partner-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Plus, Trash2, CheckCircle2, Eye, EyeOff } from "lucide-react";

const ALL_SCOPES = ["tutor", "planner", "tests", "graph", "knowledge", "content"];

function formatDate(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function KeysPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(ALL_SCOPES);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["partner-keys"],
    queryFn: () => partnerApi.keys.list(),
  });

  const createMutation = useMutation({
    mutationFn: () => partnerApi.keys.create(keyName.trim(), selectedScopes),
    onSuccess: (res) => {
      setNewKey(res.api_key);
      setCreating(false);
      setKeyName("");
      setSelectedScopes(ALL_SCOPES);
      qc.invalidateQueries({ queryKey: ["partner-keys"] });
      toast.success("API key created — copy it now, it won't be shown again");
    },
    onError: () => toast.error("Failed to create key"),
  });

  const revokeMutation = useMutation({
    mutationFn: (keyId: string) => partnerApi.keys.revoke(keyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-keys"] });
      toast.success("Key revoked");
    },
    onError: () => toast.error("Failed to revoke key"),
  });

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function toggleScope(scope: string) {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Use these keys server-side only. Never expose in browser JS — use embed tokens for that.
          </p>
        </div>
        <Button onClick={() => setCreating(true)} disabled={creating}>
          <Plus className="h-4 w-4 mr-2" />
          New Key
        </Button>
      </div>

      {/* New key revealed */}
      {newKey && (
        <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Key created — copy it now
            </CardTitle>
            <CardDescription>
              This key will never be shown again. Store it securely.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-md border bg-background px-3 py-2 font-mono text-sm break-all">
                {showKey ? newKey : "vida_live_" + "•".repeat(40)}
              </div>
              <button onClick={() => setShowKey(!showKey)} className="text-muted-foreground hover:text-foreground">
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <Button size="sm" variant="outline" onClick={() => copy(newKey, "new")}>
                {copiedId === "new" ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setNewKey(null)}>
              I&apos;ve saved it
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create form */}
      {creating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create New Key</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Key name</Label>
              <Input
                placeholder="e.g. production-server"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Feature scopes</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_SCOPES.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleScope(s)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                      selectedScopes.includes(s)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!keyName.trim() || selectedScopes.length === 0 || createMutation.isPending}
              >
                {createMutation.isPending ? "Creating…" : "Create Key"}
              </Button>
              <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keys list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (data?.keys?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <p className="text-muted-foreground text-sm">No API keys yet. Create your first key to get started.</p>
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />Create Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data?.keys?.map((k) => (
            <Card key={k.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{k.name}</span>
                      <Badge variant={k.is_active ? "default" : "secondary"} className="text-xs">
                        {k.is_active ? "Active" : "Revoked"}
                      </Badge>
                    </div>
                    <code className="text-xs text-muted-foreground">{k.key_prefix}••••••••</code>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {k.scopes?.map((s) => (
                        <span key={s} className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[11px] text-muted-foreground">
                      Last used: {formatDate(k.last_used_at)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {k.total_calls?.toLocaleString() ?? 0} calls
                    </span>
                    {k.is_active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2"
                        onClick={() => revokeMutation.mutate(k.id)}
                        disabled={revokeMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
