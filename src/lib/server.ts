// src/lib/server.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const g = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  g.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
if (process.env.NODE_ENV !== "production") g.prisma = prisma;

export function noStoreJson(body: any, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new NextResponse(JSON.stringify(body), { ...init, headers });
}

export function toNumber(n: any): number {
  if (n == null) return 0;
  if (typeof n === "number") return n;
  if (typeof n === "object" && "toNumber" in n) {
    try {
      return (n as any).toNumber();
    } catch {
      return Number(String(n));
    }
  }
  return Number(n);
}
