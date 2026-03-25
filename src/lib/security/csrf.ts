// src/lib/security/csrf.ts
import type { NextRequest } from "next/server";

const TOKEN_COOKIE = "csrf";
const TOKEN_HEADER = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PROD = NODE_ENV === "production";

/**
 * CSRF guard
 * - SAFE methods: allowed.
 * - Production: require double-submit (cookie==header), else throw.
 * - Development: **skip checks** (to avoid local host/port/referrer quirks).
 */
export async function ensureCsrf(req: NextRequest): Promise<void> {
  if (SAFE_METHODS.has(req.method)) return;

  if (!IS_PROD) {
    // Dev ortamında CSRF doğrulamasını atla
    return;
  }

  const cookieToken = req.cookies.get(TOKEN_COOKIE)?.value || "";
  const headerToken = req.headers.get(TOKEN_HEADER) || "";
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw new Error("CSRF validation failed");
  }
}