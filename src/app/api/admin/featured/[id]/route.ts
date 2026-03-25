import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { assertAdminApi } from "@/lib/auth-server";
import { ensureCsrf } from "@/lib/security/csrf";
import { logAdminAction } from "@/lib/audit";

const PatchSchema = z
  .object({
    isFeatured: z.coerce.boolean().optional(),
    featuredOrder: z.coerce.number().int().nullable().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, {
    message: "Güncelleme için en az bir alan göndermelisiniz.",
  });

export async function PATCH(req: NextRequest,
  { params }: { params: { id: string } },
) {
  const me = await assertAdminApi(); // 401/403'ü kendisi atar, { id, email } döner
  await ensureCsrf(req);

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "ValidationError", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { isFeatured, featuredOrder } = parsed.data;

  // isFeatured false ise featuredOrder'ı otomatik null'a çekmek isteyebilirsin
  const data: Record<string, any> = {};
  if (typeof isFeatured !== "undefined") data.isFeatured = isFeatured;
  if (typeof featuredOrder !== "undefined") data.featuredOrder = featuredOrder;
  if (isFeatured === false && typeof featuredOrder === "undefined") {
    data.featuredOrder = null;
  }

  try {
    const updated = await prisma.product.update({
      where: { id: params.id },
      data,
      select: {
        id: true,
        title: true,
        slug: true,
        isFeatured: true,
        featuredOrder: true,
        images: { select: { id: true, url: true, isPrimary: true } },
      },
    });

    // audit (opsiyonel)
    try {
      await logAdminAction?.({
        adminId: me.id,
        action: "PRODUCT_FEATURE_UPDATE",
        entity: "Product",
        entityId: updated.id,
        message: `Updated featured flags for ${updated.slug}`,
        meta: data,
      });
    } catch {}

    return NextResponse.json({ ok: true, product: updated });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json(
        { ok: false, error: "NotFound", message: "Ürün bulunamadı." },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "UpdateFailed", message: err?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}
