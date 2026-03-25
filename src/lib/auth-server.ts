// src/lib/auth-server.ts
import "server-only";

import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/prisma";
import { NextResponse, type NextRequest } from "next/server";

/* -------------------- Config -------------------- */

export const TOKEN_COOKIE = "token"; // tek kaynak
const DEFAULT_DAYS = 7;
const REFRESH_THRESHOLD_SECONDS = 72 * 60 * 60;


/* -------------------- Session Helpers (by context) -------------------- */

/** İstek bağlamında (Route Handler) oturum: sadece req.cookies kullanır. */
export async function getSessionUserFromRequest(req: NextRequest): Promise<SessionUser | null> {
  noStore();
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  if (!token) return null;

  let decoded: JwtPayload | null = null;
  try {
    decoded = jwt.verify(token, assertSecret()) as JwtPayload;
  } catch {
    return null;
  }

  const userId = parseUserIdFromSub(decoded?.sub);
  if (!userId) return null;

  await maybeRefreshToken(userId, decoded!);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        defaultAddressId: true,
      },
    });
    return user ?? null;
  } catch {
    return null;
  }
}

/** Server Component / RSC bağlamında oturum: global cookies() (await) kullanır. */
export async function getSessionUser(): Promise<SessionUser | null> {
  noStore();
  const store = await cookies();
  const token = store.get(TOKEN_COOKIE)?.value;
  if (!token) return null;

  let decoded: JwtPayload | null = null;
  try {
    decoded = jwt.verify(token, assertSecret()) as JwtPayload;
  } catch {
    await clearSessionCookie();
    return null;
  }

  const userId = parseUserIdFromSub(decoded?.sub);
  if (!userId) return null;

  await maybeRefreshToken(userId, decoded!);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        defaultAddressId: true,
      },
    });
    return user ?? null;
  } catch {
    return null;
  }
}
/* -------------------- Types --------------------- */

export type SessionUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string; // "ADMIN" | "CUSTOMER"
  defaultAddressId?: string | null;
};

type JwtPayload = {
  sub?: unknown;
  iat?: number;
  exp?: number;
} & Record<string, any>;

/* -------------------- Utils --------------------- */

function assertSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  return s;
}

function parseUserIdFromSub(sub: unknown): string | null {
  if (typeof sub === "string") return sub;
  if (sub && typeof sub === "object") {
    const any = sub as Record<string, unknown>;
    if (typeof any.id === "string") return any.id;
    if (typeof any.uid === "string") return any.uid;
  }
  return null;
}

/* -------------------- Cookie I/O -------------------- */

/** Oturum çerezi ayarla (login/signup sonrası). */
export async function setSessionCookie(
  userId: string,
  opts?: { rememberDays?: number },
): Promise<void> {
  const secret = assertSecret();
  const days = Math.max(1, Math.floor(opts?.rememberDays ?? DEFAULT_DAYS));
  const maxAge = days * 24 * 60 * 60; // saniye

  const token = jwt.sign({ sub: userId }, secret, { expiresIn: `${days}d` });

  const store = cookies();
  store.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // dev'de false
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

/** Oturum çerezini temizle (logout). */
export async function clearSessionCookie(): Promise<void> {
  try {
    const store = cookies();
    store.delete(TOKEN_COOKIE);
  } catch {
    // çerez yoksa sessiz geç
  }
}

/** Server-side logout helper: tek noktadan çağır. */
export async function logoutServer(): Promise<void> {
  await clearSessionCookie();
}

/**
 * Token’ın süresi bitmeye 72 saatten az kaldıysa otomatik yeniler (sessiz refresh).
 */
async function maybeRefreshToken(userId: string, payload: JwtPayload) {
  if (!payload?.exp) return;
  const nowSec = Math.floor(Date.now() / 1000);
  const secondsLeft = payload.exp - nowSec;
  if (secondsLeft > REFRESH_THRESHOLD_SECONDS) return;

  try {
    await setSessionCookie(userId, { rememberDays: DEFAULT_DAYS });
  } catch {
    // refresh başarısızsa sessiz geç
  }
}

/* -------------------- Session -------------------- */

/** Server tarafında oturum kullanıcısını getirir (cache YOK). */


/**
 * Oturum zorunlu helper.
 * - `returnTo` verilirse login'e yönlendirir.
 * - verilmezse `Unauthenticated` hatası fırlatır (API’lerde kullanışlı).
 */
export async function requireUser(returnTo?: string): Promise<SessionUser> {
  noStore();
  const user = await getSessionUser();
  if (user) return user;

  if (returnTo) {
    const q = `?returnTo=${encodeURIComponent(returnTo)}`;
    redirect(`/account/login${q}`);
  }

  throw new Error("Unauthenticated");
}

/* ---------- Legacy alias (eski importları kırmamak için) ---------- */
export async function getSession() {
  return getSessionUser();
}

/**
 * Admin zorunlu helper (UI sayfaları için).
 * Admin değilse login’e yönlendirir, `returnTo` korunur.
 */
export async function requireAdmin(returnTo?: string) {
  const me = await getSessionUser();
  if (!me || me.role !== "ADMIN") {
    const to = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
    redirect(`/account/login${to}`);
  }
  return me;
}

/**
 * Admin zorunlu helper (API için).
 * NOT: Burada asla redirect/throw yapmıyoruz.
 * - Admin değilse: JSON 401/403 dönen NextResponse
 * - Admin ise: null (guard geçti)
 *
 * Kullanım (route handler içinde):
 *   const guard = await assertAdminApi();
 *   if (guard) return guard;
 *   // ... devam
 */
export async function assertAdminApi(req?: NextRequest): Promise<NextResponse | null> {
  const me = req ? await getSessionUserFromRequest(req) : await getSessionUser();
  if (!me) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (me.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}
