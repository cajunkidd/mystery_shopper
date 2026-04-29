const BASE = "/api/v1";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function getToken(): string | null {
  return localStorage.getItem("token");
}

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const t = getToken();
  if (t) headers.set("Authorization", `Bearer ${t}`);
  const res = await fetch(BASE + path, { ...init, headers });
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // ignore
    }
    throw new ApiError(res.status, body, `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

export function pdfUrl(shopId: string): string {
  const t = getToken();
  // For PDF download we use a query param fallback in dev — but cleaner is to set Authorization via fetch + blob.
  return `${BASE}/shops/${shopId}/pdf?t=${t ?? ""}`;
}

export async function downloadPdf(shopId: string) {
  const t = getToken();
  const res = await fetch(`${BASE}/shops/${shopId}/pdf`, {
    headers: t ? { Authorization: `Bearer ${t}` } : {},
  });
  if (!res.ok) throw new Error("PDF failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `shop-${shopId.slice(0, 8)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
