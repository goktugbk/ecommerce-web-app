// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth-server";

/* ---------------- Helpers ---------------- */
function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}
function err(message = "Internal Server Error", status = 500, extra?: any) {
  if (process.env.NODE_ENV !== "production") {
    console.error("[/api/admin/users] ERROR:", message, extra);
  }
  return NextResponse.json({ ok: false, error: message }, { status });
}
async function requireAdmin() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (me.role !== "ADMIN") return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  return null;
}

/* ---------------- Query schema (GET) ---------------- */
const QuerySchema = z.object({
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(["ADMIN", "CUSTOMER"]).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sortBy: z.enum(["createdAt", "email"]).default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

/* ---------------- GET /api/admin/users ---------------- */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (guard) return guard;

    const parsed = QuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Bad Request", issues: parsed.error.format() }, { status: 400 });
    }
    const { q, page, pageSize, role, dateFrom, dateTo, sortBy, sortDir } = parsed.data;

    const whereAND: any[] = [];
    if (q && q.length > 0) {
      const like = { contains: q, mode: "insensitive" as const };
      whereAND.push({ OR: [{ email: like }, { firstName: like }, { lastName: like }, { phone: like }] });
    }
    if (role) whereAND.push({ role });
    if (dateFrom || dateTo) {
      whereAND.push({
        createdAt: {
          ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
          ...(dateTo ? { lte: new Date(dateTo) } : {}),
        },
      });
    }
    const where = whereAND.length ? { AND: whereAND } : {};

    const orderBy = sortBy === "email" ? { email: sortDir } : { createdAt: sortDir };

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    const safeItems = items.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    }));

    const pages = Math.max(1, Math.ceil(total / pageSize));

    return ok({ page, pageSize, pages, total, items: safeItems });
  } catch (e: any) {
    return err(e?.message || "Internal Server Error", 500, e);
  }
}

/* ---------------- PATCH /api/admin/users (role update) ---------------- */
const PatchSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["ADMIN", "CUSTOMER"]),
});

export async function PATCH(req: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (guard) return guard;

    const json = await req.json();
    const parsed = PatchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Bad Request", issues: parsed.error.format() }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: parsed.data.id },
      data: { role: parsed.data.role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const safe = { ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() };
    return NextResponse.json({ ok: true, user: safe });
  } catch (e: any) {
    return err(e?.message || "Invalid request", 400, e);
  }
}
