// src/app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";

// Bu endpoint her istekte dinamik çalışsın (RSC cache olmasın)
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const user = await getSessionUser();

    const res = NextResponse.json(
      { ok: true, user: user ?? null },
      { status: 200 },
    );
    // Tarayıcı/ara katman cache’lerini kapat
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (err) {
    console.error("GET /api/auth/me error:", err);
    const res = NextResponse.json(
      { ok: false, user: null, error: "Failed to fetch session user" },
      { status: 500 },
    );
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
}
