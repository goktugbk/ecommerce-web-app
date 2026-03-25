// src/app/api/admin/audit/route.ts
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
    console.error("[/api/admin/audit] ERROR:", message, extra);
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
  adminId: z.string().trim().optional(),
  action: z.string().trim().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

/* ---------------- GET /api/admin/audit ---------------- */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (guard) return guard;

    const parsed = QuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Bad Request", issues: parsed.error.format() }, { status: 400 });
    }
    const { q, page, pageSize, adminId, action, dateFrom, dateTo, sortDir } = parsed.data;

    const whereAND: any[] = [];
    if (q) {
      const like = { contains: q, mode: "insensitive" as const };
      // string alanlarda serbest arama
      whereAND.push({
        OR: [
          { action: like },
          { entity: like },
          { entityId: like },
          { message: like },
          { ip: like },
          { userAgent: like },
          { path: like },
          { requestId: like },
        ],
      });
    }
    if (adminId) whereAND.push({ adminId });
    if (action) whereAND.push({ action });
    if (dateFrom || dateTo) {
      whereAND.push({
        createdAt: {
          ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
          ...(dateTo ? { lte: new Date(dateTo) } : {}),
        },
      });
    }

    const where = whereAND.length ? { AND: whereAND } : {};

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [items, total] = await Promise.all([
      prisma.adminAudit.findMany({
        where,
        orderBy: { createdAt: sortDir },
        skip,
        take,
        select: {
          id: true,
          adminId: true,
          action: true,
          entity: true,
          entityId: true,
          message: true,
          meta: true,
          path: true,
          ip: true,
          userAgent: true,
          requestId: true,
          createdAt: true,
        },
      } as any),
      prisma.adminAudit.count({ where } as any),
    ]);

    // Serialize & stringify meta (if object/string)
    const safeItems = items.map((x: any) => ({
      ...x,
      createdAt: x.createdAt instanceof Date ? x.createdAt.toISOString() : x.createdAt,
      meta: typeof x.meta === "object" && x.meta !== null ? JSON.stringify(x.meta) : x.meta ?? undefined,
    }));

    const pages = Math.max(1, Math.ceil(total / pageSize));
    return ok({ page, pageSize, pages, total, items: safeItems });
  } catch (e: any) {
    return err(e?.message || "Internal Server Error", 500, e);
  }
}
