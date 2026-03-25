
// src/lib/security/csrf-client.ts
/** Read CSRF token from <meta name="csrf-token"> or 'csrf' cookie */
function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[2]) : null;
}

export function csrfToken(): string {
  if (typeof document === "undefined") return "";
  const meta = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null;
  return meta?.content || readCookie("csrf") || "";
}

/** Merge existing init with CSRF header and same-origin credentials */
export function withCsrf(init: RequestInit = {}): RequestInit {
  const token = csrfToken();
  const headers = new Headers(init.headers as any);
  if (token && !headers.has("x-csrf-token")) headers.set("x-csrf-token", token);
  return {
    ...init,
    headers,
    credentials: init.credentials ?? "same-origin",
  };
}


/** Ensure CSRF cookie exists (calls /api/csrf if missing) */
export async function ensureCsrfReady(): Promise<void> {
  if (typeof document === "undefined") return;
  const has = document.cookie.includes("csrf=");
  if (has) return;
  try {
    await fetch("/api/csrf", { cache: "no-store", credentials: "same-origin" });
  } catch {}
}
