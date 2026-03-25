// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jwtVerify, type JWTPayload } from "jose";

/* ====== Sabitler ====== */
const ADMIN_MATCHERS = [/^\/(?:\(site\)\/)?admin(?:\/.*)?$/, /^\/api\/admin(?:\/.*)?$/];
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const APP_ORIGIN = process.env.APP_ORIGIN ?? "http://localhost:3000";
const TOKEN_COOKIE = "token";
const CSRF_COOKIE = "csrf";
const NODE_ENV = process.env.NODE_ENV ?? "development";
const IS_PROD = NODE_ENV === "production";

/* ====== Rate limit (çok basit, prod'da Redis önerilir) ====== */
const buckets = new Map<string, { c: number; ts: number }>();
function hit(key: string, limit = 50, windowMs = 60_000) {
  const now = Date.now();
  const b = buckets.get(key) ?? { c: 0, ts: now };
  if (now - b.ts > windowMs) {
    b.c = 0; b.ts = now;
  }
  b.c++; buckets.set(key, b);
  return b.c <= limit;
}

/* ====== Güvenlik başlıkları ====== */
function buildSecurityHeaders() {
  const base: Record<string, string> = {
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
  };
  if (IS_PROD) {
    base["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload";
  }
  const connectSrc = IS_PROD ? ["'self'"] : ["'self'", "ws:", "wss:", APP_ORIGIN];
  base["Content-Security-Policy"] =
    [
      "default-src 'self'",
      "img-src 'self' https: data:",
      `script-src 'self'${IS_PROD ? "" : " 'unsafe-eval'"}`,
      "style-src 'self' 'unsafe-inline'",
      `connect-src ${connectSrc.join(" ")}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
    ].join("; ") + ";";
  return base;
}
function withSecurityHeaders(res: NextResponse) {
  const headers = buildSecurityHeaders();
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  if (!res.headers.get("x-request-id")) res.headers.set("x-request-id", crypto.randomUUID());
  return res;
}

/* ====== Yardımcılar ====== */
function isAdminPath(pathname: string) {
  return ADMIN_MATCHERS.some((re) => re.test(pathname));
}
function isApiPath(pathname: string) {
  return pathname.startsWith("/api/");
}
function isHtmlNavigation(req: NextRequest) {
  // HTML sayfa gezintilerini tespit et (API ve asset dışı)
  const accept = req.headers.get("accept") || "";
  return accept.includes("text/html");
}
function randomHex(bytes = 16) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}
function setCsrfIfMissing(req: NextRequest, res: NextResponse) {
  if (!req.cookies.get(CSRF_COOKIE)?.value) {
    res.cookies.set(CSRF_COOKIE, randomHex(16), {
      httpOnly: false,               // client (meta) okuyacak
      secure: IS_PROD,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,      // 7 gün
    });
  }
}
async function verifyJwt(token: string) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret");
  const { payload } = await jwtVerify(token, secret);
  return payload as JWTPayload & { sub?: string; role?: string; email?: string };
}
function json(status: number, body: any) {
  return withSecurityHeaders(NextResponse.json(body, { status }));
}

/* ====== Middleware ====== */
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const adminPath = isAdminPath(pathname);
  const apiPath = isApiPath(pathname);
  const loginPath = pathname.startsWith("/account/login");

  // OPTIONS preflight → geçir (HTML istekse CSRF set edelim)
  if (req.method === "OPTIONS") {
    const res = NextResponse.next();
    if (!apiPath && isHtmlNavigation(req)) setCsrfIfMissing(req, res);
    return withSecurityHeaders(res);
  }

  // Rate limit: login ve admin yolları
  if (loginPath || pathname.startsWith("/api/admin")) {
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || "0.0.0.0";
    const key = `${ip}:${req.method}:${pathname}`;
    if (!hit(key)) {
      return apiPath
        ? json(429, { ok: false, error: "Too Many Requests" })
        : withSecurityHeaders(new NextResponse("Too Many Requests", { status: 429 }));
    }
  }

  // Prod'da HTTPS'e zorla
  if (IS_PROD) {
    const proto = req.headers.get("x-forwarded-proto");
    if (proto && proto !== "https") {
      const httpsUrl = new URL(req.url);
      httpsUrl.protocol = "https:";
      const res = NextResponse.redirect(httpsUrl);
      if (!apiPath && isHtmlNavigation(req)) setCsrfIfMissing(req, res);
      return withSecurityHeaders(res);
    }
  }

  // Admin dışı yollar: güvenlik başlıkları + (HTML ise) CSRF set
  if (!adminPath) {
    const res = NextResponse.next();
    if (!apiPath && isHtmlNavigation(req)) setCsrfIfMissing(req, res);
    return withSecurityHeaders(res);
  }

  // Admin yolları: token?
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  if (!token) {
    if (apiPath) return json(401, { ok: false, error: "Unauthorized" });
    const login = new URL("/account/login", req.url);
    login.searchParams.set("returnTo", pathname + search);
    const res = NextResponse.redirect(login);
    if (isHtmlNavigation(req)) setCsrfIfMissing(req, res);
    return withSecurityHeaders(res);
  }

  // JWT + rol kontrolü
  try {
    const payload = await verifyJwt(token);
    if (payload.role && payload.role !== "ADMIN") {
      if (apiPath) return json(403, { ok: false, error: "Forbidden" });
      const login = new URL("/account/login", req.url);
      login.searchParams.set("returnTo", pathname + search);
      const res = NextResponse.redirect(login);
      if (isHtmlNavigation(req)) setCsrfIfMissing(req, res);
      return withSecurityHeaders(res);
    }
  } catch {
    if (apiPath) return json(401, { ok: false, error: "Unauthorized" });
    const login = new URL("/account/login", req.url);
    login.searchParams.set("returnTo", pathname + search);
    const res = NextResponse.redirect(login);
    if (isHtmlNavigation(req)) setCsrfIfMissing(req, res);
    return withSecurityHeaders(res);
  }

  // Admin altında mutating isteklerde same-origin kontrolü (CSRF)
  if (MUTATING.has(req.method)) {
    const origin = req.headers.get("origin") || "";
    const referer = req.headers.get("referer") || "";
    const ok =
      (origin && origin.startsWith(APP_ORIGIN)) ||
      (referer && referer.startsWith(APP_ORIGIN));
    if (!ok) {
      return apiPath
        ? json(403, { ok: false, error: "Bad CSRF" })
        : withSecurityHeaders(new NextResponse("Bad CSRF", { status: 403 }));
    }
  }

  // Varsayılan geçiş: (HTML ise) CSRF set
  const res = NextResponse.next();
  if (!apiPath && isHtmlNavigation(req)) setCsrfIfMissing(req, res);
  return withSecurityHeaders(res);
}

/* ====== Matcher ====== */
// Admin UI (hem /(site)/admin hem /admin), Admin API ve login sayfası
export const config = {
  matcher: ["/(site)/admin/:path*", "/admin/:path*", "/api/admin/:path*", "/account/login"],
};
