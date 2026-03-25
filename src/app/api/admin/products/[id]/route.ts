// src/app/api/admin/products/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, assertAdminApi } from "@/lib/auth-server";
import { ensureCsrf } from "@/lib/security/csrf";
import { logAdminAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";

/* ----------------------- Helpers ----------------------- */
function jsonErr(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...(extra ?? {}) }, { status });
}
function jsonOk(body?: Record<string, unknown>, status = 200) {
  return NextResponse.json({ ok: true, ...(body ?? {}) }, { status });
}

/* ----------------------- DELETE ----------------------- */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  // CSRF + Admin (dev'de CSRF gevşek; prod'da zorunlu)
  try { await ensureCsrf(req); } catch { /* dev'de skip, prod'da middleware 403 döndürür */ }
  const guard = await assertAdminApi(req);
  if (guard) return guard;

  const id = params.id;

  // Ürün var mı?
  const target = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!target) return jsonErr("NotFound", 404);

  try {
    await prisma.$transaction(async (tx) => {
      // Tüm bağımlıları sil (hard delete)
      try { await tx.orderItem.deleteMany({ where: { productId: id } }); } catch {}
      try { await tx.cartItem.deleteMany({ where: { productId: id } }); } catch {}
      try { await tx.inventory.deleteMany({ where: { productId: id } }); } catch {}
      try { await tx.productImage.deleteMany({ where: { productId: id } }); } catch {}
      try { await tx.productVariant.deleteMany({ where: { productId: id } }); } catch {}
      // En sonda ürün
      await tx.product.delete({ where: { id } });
    });

    try {
      revalidatePath("/products");
      revalidatePath("/collections/all");
      revalidatePath("/");
    } catch {}

    return jsonOk({ hardDeleted: true });
  } catch (e: any) {
    return jsonErr("HardDeleteFailed", 500, { message: e?.message ?? "Unknown error" });
  }
}


/* ----------------------- PATCH (toggle-active) ----------------------- */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try { await ensureCsrf(req); } catch { return jsonErr("CSRF validation failed", 403); }
  const guard = await assertAdminApi(req);
  if (guard) return guard;

  const id = params.id;
  const body = await req.json().catch(() => ({} as any));
  const op = body?.op as string | undefined;

  if (op !== "toggle-active") return jsonErr("BadRequest", 400);

  try {
    const current = await prisma.product.findUnique({
      where: { id },
      select: { isActive: true, slug: true, category: { select: { slug: true } } },
    });
    if (!current) return jsonErr("NotFound", 404);

    const updated = await prisma.product.update({
      where: { id },
      data: { isActive: !current.isActive },
      select: { isActive: true },
    });

    try {
      // Revalidate ilgili sayfalar
      if (current.slug) revalidatePath(`/products/${current.slug}`);
      if (current.category?.slug) revalidatePath(`/collections/${current.category.slug}`);
      revalidatePath("/products");
      revalidatePath("/collections/all");
      revalidatePath("/");
    } catch {}

    const me = await getSessionUser();
    await logAdminAction({
      adminId: me?.id || "unknown",
      action: `product.${updated.isActive ? "activate" : "deactivate"}`,
      path: `/api/admin/products/${id}`,
      details: { productId: id },
    });

    return jsonOk({ isActive: updated.isActive });
  } catch (e: any) {
    return jsonErr("UpdateFailed", 500, { message: e?.message ?? "Unknown error" });
  }
}


/* ----------------------- POST (form method override) ----------------------- */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try { await ensureCsrf(req); } catch { /* dev'de skip */ }
  const guard = await assertAdminApi(req);
  if (guard) return guard;

  const id = params.id;
  const ctype = req.headers.get("content-type") || "";
  if (!ctype.includes("application/x-www-form-urlencoded") && !ctype.includes("multipart/form-data")) {
    return NextResponse.json({ ok: false, error: "Unsupported content-type" }, { status: 415 });
  }

  const form = await req.formData();
  const method = String(form.get("_method") || "").toUpperCase();
  const op = String(form.get("op") || "");

  if (method === "PATCH") {
    try {
      if (op === "toggle-active") {
        const current = await prisma.product.findUnique({
          where: { id },
          select: { isActive: true, slug: true, category: { select: { slug: true } } },
        });
        if (!current) return NextResponse.redirect(new URL("/admin/products", req.url), 303);
        await prisma.product.update({ where: { id }, data: { isActive: !current.isActive } });
        try {
          if (current.slug) revalidatePath(`/products/${current.slug}`);
          if (current.category?.slug) revalidatePath(`/collections/${current.category.slug}`);
          revalidatePath("/products"); revalidatePath("/collections/all"); revalidatePath("/");
        } catch {}
        return NextResponse.redirect(new URL("/admin/products", req.url), 303);
      }

      if (op === "inc-stock") {
        await prisma.inventory.upsert({
          where: { productId: id },
          update: { quantity: { increment: 1 } },
          create: { productId: id, quantity: 1 },
        });
        return NextResponse.redirect(new URL("/admin/products", req.url), 303);
      }

      if (op === "dec-stock") {
        const inv = await prisma.inventory.upsert({
          where: { productId: id },
          update: {},
          create: { productId: id, quantity: 0 },
        });
        const newQty = Math.max(0, (inv.quantity ?? 0) - 1);
        await prisma.inventory.update({ where: { productId: id }, data: { quantity: newQty } });
        return NextResponse.redirect(new URL("/admin/products", req.url), 303);
      }

      return NextResponse.redirect(new URL("/admin/products", req.url), 303);
    } catch (e: any) {
      return NextResponse.redirect(new URL("/admin/products?err=patch", req.url), 303);
    }
  }

  return NextResponse.redirect(new URL("/admin/products", req.url), 303);
}
