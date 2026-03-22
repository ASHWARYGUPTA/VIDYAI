/**
 * Partner API client — uses stored API key as Bearer token.
 * Separate from the student API client which uses Supabase JWT.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const STORAGE_KEY = "vidyai_partner_key";

export function getPartnerKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setPartnerKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key);
}

export function clearPartnerKey(): void {
  localStorage.removeItem(STORAGE_KEY);
}

async function partnerRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const key = getPartnerKey();
  if (!key) throw Object.assign(new Error("No API key"), { status: 401 });

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err?.detail?.error ?? err?.error ?? "Request failed"), {
      status: res.status,
      detail: err,
    });
  }
  return res.json() as Promise<T>;
}

export const partnerApi = {
  // Validate key + get partner info
  validate: () =>
    partnerRequest<{
      valid: boolean;
      partner_id: string;
      partner_name: string;
      tier: string;
      allowed_features: string[];
    }>("/api/v1/embed/session/validate"),

  // API Keys
  keys: {
    list: () =>
      partnerRequest<{
        keys: {
          id: string;
          key_prefix: string;
          name: string;
          is_active: boolean;
          last_used_at: string | null;
          total_calls: number;
          expires_at: string | null;
          scopes: string[];
          created_at: string;
        }[];
      }>("/api/v1/partner/keys"),

    create: (name: string, scopes: string[]) =>
      partnerRequest<{ api_key: string; key_prefix: string; id: string }>(
        "/api/v1/partner/keys",
        { method: "POST", body: JSON.stringify({ name, scopes }) }
      ),

    revoke: (keyId: string) =>
      partnerRequest<{ revoked: boolean }>(`/api/v1/partner/keys/${keyId}`, {
        method: "DELETE",
      }),
  },

  // Usage analytics
  usage: (from?: string, to?: string) => {
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    return partnerRequest<{
      total_calls: number;
      by_tool: { tool: string; count: number }[];
      by_day: { date: string; count: number }[];
      tokens_used: number;
    }>(`/api/v1/partner/usage${qs.toString() ? `?${qs}` : ""}`);
  },

  // Students
  students: (limit = 50, offset = 0) =>
    partnerRequest<{
      students: {
        id: string;
        external_student_id: string;
        exam_type: string | null;
        created_at: string;
      }[];
      total: number;
    }>(`/api/v1/partner/students?limit=${limit}&offset=${offset}`),

  // Embed settings
  settings: {
    get: () =>
      partnerRequest<{
        allowed_origins: string[];
        webhook_url: string | null;
        allowed_features: string[];
        tier: string;
      }>("/api/v1/embed/settings"),

    update: (body: { allowed_origins?: string[]; webhook_url?: string }) =>
      partnerRequest<{ updated: string[] }>("/api/v1/embed/settings", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
  },
};
