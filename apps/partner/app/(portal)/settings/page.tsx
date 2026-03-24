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
import { Plus, Trash2, Save, Globe, Webhook } from "lucide-react";

export default function SettingsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["partner-settings"],
    queryFn: () => partnerApi.settings.get(),
  });

  const [origins, setOrigins]     = useState<string[]>([]);
  const [newOrigin, setNewOrigin] = useState("");
  const [webhook, setWebhook]     = useState("");
  const [dirty, setDirty]         = useState(false);

  // Hydrate local state once data loads
  const [hydrated, setHydrated] = useState(false);
  if (data && !hydrated) {
    setOrigins(data.allowed_origins ?? []);
    setWebhook(data.webhook_url ?? "");
    setHydrated(true);
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      partnerApi.settings.update({
        allowed_origins: origins,
        webhook_url: webhook || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-settings"] });
      setDirty(false);
      toast.success("Settings saved");
    },
    onError: () => toast.error("Failed to save settings"),
  });

  function addOrigin() {
    const o = newOrigin.trim().replace(/\/$/, "");
    if (!o || origins.includes(o)) { setNewOrigin(""); return; }
    setOrigins((prev) => [...prev, o]);
    setNewOrigin("");
    setDirty(true);
  }

  function removeOrigin(o: string) {
    setOrigins((prev) => prev.filter((x) => x !== o));
    setDirty(true);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        {dirty && (
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving…" : "Save Changes"}
          </Button>
        )}
      </div>

      {/* Plan */}
      {!isLoading && data && (
        <Card>
          <CardContent className="py-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Current Plan</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Features: {data.allowed_features?.join(", ") || "all"}
              </p>
            </div>
            <Badge className="capitalize">{data.tier}</Badge>
          </CardContent>
        </Card>
      )}

      {/* CORS origins */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" />
            Allowed Origins (CORS)
          </CardTitle>
          <CardDescription>
            Domains from which your embed SDK is allowed to make API calls. Add every domain
            where you embed VidyAI widgets.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-24" />
          ) : (
            <>
              <div className="flex flex-wrap gap-2 min-h-[2rem]">
                {origins.length === 0 && (
                  <span className="text-sm text-muted-foreground">No origins added yet</span>
                )}
                {origins.map((o) => (
                  <span
                    key={o}
                    className="flex items-center gap-1.5 rounded-full border bg-secondary px-3 py-1 text-xs font-mono"
                  >
                    {o}
                    <button
                      onClick={() => removeOrigin(o)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="https://yoursite.com"
                  value={newOrigin}
                  onChange={(e) => setNewOrigin(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addOrigin()}
                  className="font-mono text-sm"
                />
                <Button variant="outline" onClick={addOrigin} disabled={!newOrigin.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Webhook */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Webhook className="h-4 w-4" />
            Webhook URL
          </CardTitle>
          <CardDescription>
            VidyAI will POST signed events here when async tasks complete (video processed, plan
            generated, test graded). Payload is signed with{" "}
            <code className="text-xs">X-VidyAI-Signature: sha256=…</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <Skeleton className="h-10" />
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>Endpoint URL</Label>
                <Input
                  placeholder="https://api.yoursite.com/vidyai-webhook"
                  value={webhook}
                  onChange={(e) => { setWebhook(e.target.value); setDirty(true); }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Events: <code>video.processed</code> · <code>plan.generated</code> ·{" "}
                <code>test.completed</code> · <code>revision.streak_broken</code>
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {dirty && (
        <div className="flex justify-end">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  );
}
