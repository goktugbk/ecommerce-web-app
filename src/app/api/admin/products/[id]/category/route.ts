// src/app/api/admin/products/[id]/category/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { assertAdminApi, getSessionUser } from "@/lib/auth-server";
import { ensureCsrf } from "@/lib/security/csrf";
import { logAdminAction } from "@/lib/audit";

/* -------------------- Schema -------------------- */
// "" -> null çevir, string ise trim et
const BodySchema = z.object({
  categoryId: z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? null : v.trim()) : v),
    z.string().min(1).nullable()
  ),
});

/* -------------------- Helper -------------------- */
async function requireAdmin() {
  const me = await getSessionUser();
  if (!me || me.role !== "ADMIN") {
    return {
      ok: false as const,
      res: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true as const };
}

function jsonErr(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...(extra ?? {}) }, { status });
}

/* -------------------- PATCH -------------------- */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  // Kimlik ve CSRF
  const me = await assertAdminApi();
  await ensureCsrf(req);

  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  // İstek gövdesi
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonErr("ValidationError", 400, { issues: parsed.error.flatten() });
  }
  const nextCategoryId = parsed.data.categoryId; // string | null

  // Ürün + mevcut kategori slug
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    select: { id: true, slug: true, categoryId: true, category: { select: { slug: true } } },
  });
  if (!product) return jsonErr("ProductNotFound", 404);

  // Yeni kategori kontrolü (null değilse var olmalı)
  let newCategorySlug: string | null = null;
  if (nextCategoryId) {
    const cat = await prisma.category.findUnique({
      where: { id: nextCategoryId },
      select: { id: true, slug: true },
    });
    if (!cat) return jsonErr("CategoryNotFound", 404);
    newCategorySlug = cat.slug;
  }

  // Güncelleme
  await prisma.product.update({
    where: { id: product.id },
    data: { categoryId: nextCategoryId },
  });

  // Audit
  await logAdminAction({
    actorId: me.id,
    action: "product.updateCategory",
    target: product.id,
    meta: {
      fromCategoryId: product.categoryId ?? null,
      toCategoryId: nextCategoryId,
    },
  });

  // Revalidate: eski ve yeni koleksiyon sayfaları + koleksiyon listesi + anasayfa + ürün
  const oldCategorySlug = product.category?.slug ?? null;
  try {
    if (oldCategorySlug) revalidatePath(`/collections/${oldCategorySlug}`);
    if (newCategorySlug) revalidatePath(`/collections/${newCategorySlug}`);
    revalidatePath("/collections/all");
    revalidatePath("/");
    revalidatePath(`/products/${product.slug}`);
  } catch {
    // revalidate hatası API yanıtını düşürmesin
  }

  return NextResponse.json({
    ok: true,
    product: {
      id: product.id,
      slug: product.slug,
      previousCategorySlug: oldCategorySlug,
      nextCategorySlug: newCategorySlug,
    },
  });
}
