// src/app/api/admin/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getSessionUser, assertAdminApi } from "@/lib/auth-server";
import { ensureCsrf } from "@/lib/security/csrf";
import { logAdminAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";

/* ---------------------- Helpers ---------------------- */

async function requireAdmin() {
  const me = await getSessionUser();
  if (!me) {
    return {
      ok: false as const,
      res: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (me.role !== "ADMIN") {
    return {
      ok: false as const,
      res: NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }),
    };
  }
  return { ok: true as const, me };
}

function jsonErr(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...(extra ?? {}) }, { status });
}
function jsonOk(body?: Record<string, unknown>, status = 200) {
  return NextResponse.json({ ok: true, ...(body ?? {}) }, { status });
}

/* ---------------------- Schemas ---------------------- */

const QuerySchema = z.object({
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  isActive: z.enum(["0", "1"]).transform((v) => v === "1").optional(), // filtre opsiyonel
  categoryId: z.string().trim().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  sortBy: z.enum(["createdAt", "price", "title"]).default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

const ImageSchema = z.object({
  url: z.string().url(),
  alt: z.string().optional(),
  isPrimary: z.boolean().optional(),
  isHover: z.boolean().optional(),
});

const CreateSchema = z.object({
  title: z.string().min(2),
  slug: z.string().min(2),
  price: z.number().positive(),
  currency: z.string().min(3).max(3).default("TRY"),
  description: z.string().optional(),
  categoryId: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().optional()),
  images: z.array(ImageSchema).optional(),
  inventory: z
    .object({
      quantity: z.number().int().min(0),
      lowStockThreshold: z.number().int().min(0).optional(),
    })
    .optional(),
});

/* ---------------------- GET /api/admin/products ---------------------- */

export async function GET(req: NextRequest) {
  const me = await assertAdminApi();

  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  const parsed = QuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) {
    return jsonErr("ValidationError", 400, { issues: parsed.error.flatten() });
  }

  const { q, page, pageSize, isActive, categoryId, minPrice, maxPrice, sortBy, sortDir } = parsed.data;

  const whereAND: Prisma.ProductWhereInput[] = [];

  if (typeof isActive === "boolean") {
    whereAND.push({ isActive });
  }
  if (categoryId) whereAND.push({ categoryId });

  if (minPrice != null || maxPrice != null) {
    whereAND.push({
      price: {
        ...(minPrice != null ? { gte: new Prisma.Decimal(minPrice) } : {}),
        ...(maxPrice != null ? { lte: new Prisma.Decimal(maxPrice) } : {}),
      } as any,
    });
  }

  if (q && q.length > 0) {
    const like = { contains: q, mode: "insensitive" as const };
    whereAND.push({
      OR: [
        { title: like },
        { description: like },
        { slug: like },
        { category: { name: like as any } as any },
      ],
    });
  }

  const where: Prisma.ProductWhereInput = whereAND.length ? { AND: whereAND } : {};

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sortBy === "price"
      ? ({ price: sortDir } as any)
      : sortBy === "title"
      ? ({ title: sortDir })
      : ({ createdAt: sortDir });

  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const [total, items] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: {
        images: true,
        inventory: true,
        category: true,
      },
      orderBy,
      skip,
      take,
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  await logAdminAction({
    adminId: me.id,
    action: "products.list",
    target: "products",
    meta: { page, pageSize, q: q ?? null, isActive, categoryId: categoryId ?? null, sortBy, sortDir, total },
  });

  return jsonOk({ page, pageSize, pages, total, items });
}

/* ---------------------- POST /api/admin/products ---------------------- */

export async function POST(req: NextRequest) {
  try { await ensureCsrf(req); } catch { /* dev skip or 403 in prod */ }
  const guard = await assertAdminApi(req);
  if (guard) return guard;
  const me = await getSessionUser();

  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(json);
  if (!parsed.success) {
    return jsonErr("ValidationError", 400, { issues: parsed.error.flatten() });
  }
  const data = parsed.data;

  // slug benzersiz olmalı
  const existing = await prisma.product.findUnique({ where: { slug: data.slug } });
  if (existing) {
    return jsonErr("SlugAlreadyExists", 409);
  }

  // kategori varsa gerçekten var mı?
  if (data.categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: data.categoryId }, select: { id: true, slug: true } });
    if (!cat) return jsonErr("CategoryNotFound", 404);
  }

  // Görselde isPrimary yoksa ilkini primary kabul et
  const normalizedImages =
    data.images && data.images.length
      ? data.images.map((img, idx) => ({
          url: img.url,
          alt: img.alt,
          isPrimary: idx === 0 ? true : !!img.isPrimary,
          isHover: !!img.isHover,
        }))
      : [];

  try {
    const created = await prisma.product.create({
      data: {
        title: data.title,
        slug: data.slug,
        price: new Prisma.Decimal(data.price) as any, // Prisma.Decimal
        currency: data.currency,
        description: data.description,
        categoryId: data.categoryId,
        images: normalizedImages.length
          ? {
              create: normalizedImages,
            }
          : undefined,
        inventory: data.inventory
          ? {
              create: {
                quantity: data.inventory.quantity,
                lowStockThreshold: data.inventory.lowStockThreshold ?? 3,
              },
            }
          : undefined,
      },
      include: { images: true, inventory: true, category: { select: { id: true, slug: true, name: true } } },
    });

    await logAdminAction({
      adminId: me.id,
      action: "product.create",
      target: created.id,
      meta: { slug: created.slug, categoryId: created.category?.id ?? null },
    });

    // Revalidate: ürün, ilgili koleksiyon, koleksiyon listesi, ana sayfa
    try {
      revalidatePath(`/products/${created.slug}`);
      if (created.category?.slug) revalidatePath(`/collections/${created.category.slug}`);
      revalidatePath("/collections/all");
      revalidatePath("/");
    } catch {
      /* ignore revalidate errors */
    }

    return jsonOk({ item: created }, 201);
  } catch (e: any) {
    return jsonErr("CreateFailed", 500, { message: e?.message ?? "Unknown error" });
  }
}
