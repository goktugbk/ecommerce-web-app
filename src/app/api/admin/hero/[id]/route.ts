import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { assertAdminApi } from "@/lib/auth-server";
import { ensureCsrf } from "@/lib/security/csrf";
import { logAdminAction } from "@/lib/audit";

/* ---------------- helpers ---------------- */

const emptyToUndef = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const ButtonSchema = z.object({
  text: z.string().trim().min(1).optional(),
  label: z.string().trim().min(1).optional(),
  href: z.string().trim().min(1, "Buton linki gerekli"),
  variant: z.enum(["primary", "secondary", "ghost"]).optional().default("primary"),
}).transform((b) => ({
  text: (b.text ?? b.label ?? "").trim(),
  href: b.href.trim(),
  variant: b.variant ?? "primary",
})).refine((b) => b.text.length > 0, { message: "Buton metni gerekli" });

const PatchSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    subtitle: z.preprocess(emptyToUndef, z.string().trim().min(1).optional()),
    imageUrl: z.preprocess(emptyToUndef, z.string().url().optional()),

    // Prisma'da alan yoksa bunu kaldır
    mobileImageUrl: z.preprocess(emptyToUndef, z.string().url().optional()),

    order: z.coerce.number().int().optional(),
    isActive: z.coerce.boolean().optional(),
    startsAt: z.preprocess(emptyToUndef, z.string().datetime().optional()).nullable().optional(),
    endsAt: z.preprocess(emptyToUndef, z.string().datetime().optional()).nullable().optional(),

    // Geri uyumluluk
    ctas: z.array(ButtonSchema).optional(),
    buttons: z.array(ButtonSchema).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, {
    message: "Güncelleme için en az bir alan göndermelisiniz.",
  });

/* ---------------- PATCH ------------------ */

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const me = await assertAdminApi();
  await ensureCsrf(req);

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "ValidationError", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { ctas, buttons, startsAt, endsAt, ...rest } = parsed.data;
  const finalButtons = buttons ?? ctas;

  const data: any = { ...rest };

  if (finalButtons) data.buttons = finalButtons;

  // startsAt/endsAt string geldiyse Date'e çevir
  if (typeof startsAt !== "undefined") data.startsAt = startsAt ? new Date(startsAt) : null;
  if (typeof endsAt !== "undefined") data.endsAt = endsAt ? new Date(endsAt) : null;

  try {
    const updated = await prisma.heroSlide.update({
      where: { id: params.id },
      data,
      select: {
        id: true,
        title: true,
        subtitle: true,
        imageUrl: true,
        mobileImageUrl: true, // Prisma'da yoksa kaldır
        order: true,
        isActive: true,
        buttons: true,
        startsAt: true,
        endsAt: true,
        updatedAt: true,
      },
    } as any);

    try {
      await logAdminAction?.({
        adminId: me.id,
        action: "HERO_SLIDE_UPDATE",
        entity: "HeroSlide",
        entityId: updated.id,
        message: `Updated hero slide ${updated.id}`,
        meta: data,
      });
    } catch {}

    return NextResponse.json({ ok: true, slide: updated });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json(
        { ok: false, error: "NotFound", message: "Hero slide bulunamadı." },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "UpdateFailed", message: err?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}

/* ---------------- DELETE ----------------- */

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const me = await assertAdminApi();
  await ensureCsrf(req);

  try {
    const deleted = await prisma.heroSlide.delete({
      where: { id: params.id },
      select: { id: true, title: true },
    });

    try {
      await logAdminAction?.({
        adminId: me.id,
        action: "HERO_SLIDE_DELETE",
        entity: "HeroSlide",
        entityId: deleted.id,
        message: `Deleted hero slide ${deleted.id}`,
        meta: deleted,
      });
    } catch {}

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json(
        { ok: false, error: "NotFound", message: "Hero slide zaten yok." },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "DeleteFailed", message: err?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}
