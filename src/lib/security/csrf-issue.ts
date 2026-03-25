// src/lib/security/csrf-issue.ts
import { cookies } from "next/headers";

const TOKEN_COOKIE = "csrf";

/**
 * CSRF cookie değerini döner.
 * - Middleware zaten bu cookie'yi üretiyor olmalı.
 * - Burada sadece okumak serbest; set etmek yasak.
 */
export function readCsrfCookie(): string {
  return cookies().get(TOKEN_COOKIE)?.value ?? "";
}
