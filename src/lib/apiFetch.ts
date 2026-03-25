// src/lib/apiFetch.ts
export function getCsrfFromMeta() {
  const el = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null;
  return el?.content || "";
}

export async function apiFetch(input: RequestInfo, init: RequestInit = {}) {
  const csrf = getCsrfFromMeta();
  const headers = new Headers(init.headers || {});
  if (csrf) headers.set("x-csrf-token", csrf);

  return fetch(input, {
    ...init,
    headers,
    credentials: "same-origin",
  });
}
