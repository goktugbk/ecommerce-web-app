
// src/app/api/csrf/route.ts
import { NextRequest, NextResponse } from "next/server";

const CSRF_COOKIE = "csrf";
const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PROD = NODE_ENV === "production";

function randomHex(n: number) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}

export async function GET(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  let token = req.cookies.get(CSRF_COOKIE)?.value;

  if (!token) {
    token = randomHex(16);
    res.cookies.set(CSRF_COOKIE, token, {
      httpOnly: false,         // client meta/JS okuyabilsin
      secure: IS_PROD,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 gün
    });
  }

  return res;
}
