// src/app/api/logout/route.ts
import { NextResponse } from "next/server";
import { logoutServer } from "@/lib/auth-server";
export async function POST() {
  await logoutServer();
  return NextResponse.json({ ok: true });
}
