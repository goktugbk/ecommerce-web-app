// src/lib/auth-client.ts
"use client";

import { useEffect, useState } from "react";

/** Client tarafında oturum bilgisini temsil eder */
export type SessionUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: "ADMIN" | "CUSTOMER" | string;
} | null;

/**
 * /api/auth/me uç noktasından oturum bilgisini çeker.
 * Beklenen JSON: { ok: boolean; user: SessionUser | null; error?: string }
 */
export async function fetchSessionUser(): Promise<SessionUser> {
  try {
    const res = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn("fetchSessionUser: response not ok", res.status);
      return null;
    }

    const data = await res.json().catch(() => null);
    if (data && typeof data === "object" && "user" in data) {
      return (data as { user: SessionUser }).user ?? null;
    }

    return null;
  } catch (err) {
    console.error("fetchSessionUser error:", err);
    return null;
  }
}

/**
 * Client tarafında kolay kullanım için hook.
 * - user: SessionUser (null olabilir)
 * - loading: async isteğin durumunu gösterir
 */
export function useSessionUser() {
  const [user, setUser] = useState<SessionUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await fetchSessionUser();
      if (!mounted) return;
      setUser(u);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { user, loading };
}
