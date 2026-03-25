import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { assertAdminApi } from "@/lib/auth-server";
import { ensureCsrf } from "@/lib/security/csrf";
import { logAdminAction } from "@/lib/audit";

/* ---------------- helpers ---------------- */

function normalizeSlug(input: string) {
  return input
    .toLocaleLowerCase("tr-TR")
    .trim()
    .replace(/['"’`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

const emptyToUndef = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

/* ---------------- schema ----------------- */

const PatchSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    slug: z
      .string()
      .trim()
      .min(1)
      .transform(normalizeSlug)
      .optional(),
    imageUrl: z
      .preprocess(emptyToUndef, z.string().url().optional())
      .nullable()
      .optional(),
    homeFeatured: z.coerce.boolean().optional(),
    homeOrder: z.coerce.number().int().nullable().optional(),
  })
  // En az bir alan gelmeli
  .refine((o) => Object.keys(o).length > 0, {
    message: "Güncelleme için en az bir alan göndermelisiniz.",
    path: [],
  });

/* ---------------- PATCH ------------------ */

export async function PATCH(req: NextRequest,
  { params }: { params: { id: string } },
) {
  const me = await assertAdminApi(); // 401/403'ü kendisi atar, {id,email} döner
  await ensureCsrf(req);

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "ValidationError", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.category.update({
      where: { id: params.id },
      data: parsed.data,
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        homeFeatured: true,
        homeOrder: true,
      },
    });

    // audit (opsiyonel)
    try {
      await logAdminAction?.({
        adminId: me.id,
        action: "CATEGORY_UPDATE",
        entity: "Category",
        entityId: updated.id,
        message: `Updated ${updated.slug}`,
        meta: parsed.data,
      });
    } catch {}

    return NextResponse.json({ ok: true, category: updated });
  } catch (err: any) {
    // Kaynak yoksa
    if (err?.code === "P2025") {
      return NextResponse.json(
        { ok: false, error: "NotFound", message: "Kategori bulunamadı." },
        { status: 404 },
      );
    }
    // Unique ihlali (örn. slug çakışması)
    if (err?.code === "P2002") {
      return NextResponse.json(
        {
          ok: false,
          error: "UniqueConstraint",
          message: "Slug zaten kullanımda.",
          target: err?.meta?.target,
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "UpdateFailed", message: err?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}

/* ---------------- DELETE ----------------- */

export async function DELETE(req: NextRequest,
  { params }: { params: { id: string } },
) {
  const me = await assertAdminApi();
  await ensureCsrf(req);

  try {
    const deleted = await prisma.category.delete({
      where: { id: params.id },
      select: { id: true, name: true, slug: true },
    });

    // audit (opsiyonel)
    try {
      await logAdminAction?.({
        adminId: me.id,
        action: "CATEGORY_DELETE",
        entity: "Category",
        entityId: deleted.id,
        message: `Deleted ${deleted.slug}`,
        meta: deleted,
      });
    } catch {}

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json(
        { ok: false, error: "NotFound", message: "Kategori zaten yok." },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "DeleteFailed", message: err?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}
