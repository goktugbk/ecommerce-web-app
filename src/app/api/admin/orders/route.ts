// src/app/api/admin/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { assertAdminApi } from "@/lib/auth-server";
import { logAdminAction } from "@/lib/audit";

/* ---------------------- Query Schemas ---------------------- */
const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().optional(),                        // arama
  status: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v ? [v] : []))
    .optional(),
  dateFrom: z.string().datetime().optional(),             // ISO
  dateTo: z.string().datetime().optional(),               // ISO
  userId: z.string().optional(),
  minTotal: z.coerce.number().optional(),
  maxTotal: z.coerce.number().optional(),
  sortBy: z.enum(["createdAt", "totalAmount", "orderCode"]).default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

/* ---------------------- GET /admin/orders ---------------------- */
export async function GET(req: NextRequest) {
  // Kimlik + rol teyidi (token/cookie kontrolü içerir)
  const me = await assertAdminApi();

  // Query’yi parse et
  const { searchParams } = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "ValidationError", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    page,
    limit,
    q,
    status = [],
    dateFrom,
    dateTo,
    userId,
    minTotal,
    maxTotal,
    sortBy,
    sortDir,
  } = parsed.data;

  // WHERE koşulu
  const whereAND: any[] = [];

  if (q && q.length > 0) {
    const like = { contains: q, mode: "insensitive" as const };
    whereAND.push({
      OR: [
        { orderCode: like },
        { contactName: like },
        { contactEmail: like },
        { contactPhone: like },
        { shipFirstName: like },
        { shipLastName: like },
        { shipEmail: like },
        { shipPhone: like },
        { shipLine1: like },
        { shipDistrict: like },
        { shipCity: like },
        // user fallback alanları
        { user: { OR: [{ firstName: like }, { lastName: like }, { email: like }] } },
      ],
    });
  }

  if (status && status.length > 0) {
    whereAND.push({ status: { in: status } });
  }

  if (userId) {
    whereAND.push({ userId });
  }

  if (dateFrom || dateTo) {
    whereAND.push({
      createdAt: {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      },
    });
  }

  if (minTotal != null || maxTotal != null) {
    whereAND.push({
      totalAmount: {
        ...(minTotal != null ? { gte: minTotal } : {}),
        ...(maxTotal != null ? { lte: maxTotal } : {}),
      },
    });
  }

  const where = whereAND.length ? { AND: whereAND } : undefined;

  // Sıralama
  const orderBy: any = { [sortBy]: sortDir };

  // Sayfalama
  const skip = (page - 1) * limit;
  const take = limit;

  // Tek transaction’da toplam ve listeyi çek
  const [total, orders] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        orderCode: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        totalAmount: true,
        currency: true,

        // müşteri snapshot + iletişim
        contactName: true,
        contactEmail: true,
        contactPhone: true,

        shipFirstName: true,
        shipLastName: true,
        shipPhone: true,
        shipEmail: true,
        shipLine1: true,
        shipLine2: true,
        shipDistrict: true,
        shipCity: true,
        shipPostal: true,
        shipCountry: true,

        // fallback için user (opsiyonel)
        user: { select: { firstName: true, lastName: true, email: true } },

        // kalem sayısı
        _count: { select: { items: true } },
      },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / limit));

  // Audit
  await logAdminAction({
    actorId: me.id,
    action: "orders.list",
    target: "orders",
    meta: {
      page,
      limit,
      q: q ?? null,
      status,
      dateFrom: dateFrom ?? null,
      dateTo: dateTo ?? null,
      userId: userId ?? null,
      minTotal: minTotal ?? null,
      maxTotal: maxTotal ?? null,
      sortBy,
      sortDir,
      total,
    },
  });

  return NextResponse.json({
    ok: true,
    meta: { page, limit, pages, total, sortBy, sortDir },
    orders,
  });
}
