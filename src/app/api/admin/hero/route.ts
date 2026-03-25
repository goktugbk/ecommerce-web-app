import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { assertAdminApi } from "@/lib/auth-server";
import { ensureCsrf } from "@/lib/security/csrf";
import { logAdminAction } from "@/lib/audit";

/* ---------------- helpers ---------------- */

const ok = (data: any, status = 200) => NextResponse.json({ ok: true, ...data }, { status });
const fail = (error: string, status = 500, extra?: any) => {
  if (process.env.NODE_ENV !== "production") console.error("[/api/admin/hero]", error, extra);
  return NextResponse.json({ ok: false, error }, { status });
};

const emptyToUndef = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

// Geri uyumluluk: text/label ikisini de kabul et
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

// buttons alanı bazen JSON string gelebiliyor -> parse ediyoruz
const ButtonsInputSchema = z
  .union([
    z.array(ButtonSchema),
    z.string().transform((s) => {
      try {
        const parsed = JSON.parse(s);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }),
    z.undefined(),
    z.null(),
  ])
  .transform((v) => (Array.isArray(v) ? v : []));

const SlideCreateSchema = z.object({
  title: z.string().trim().min(2, "Başlık çok kısa"),
  subtitle: z.preprocess(emptyToUndef, z.string().trim().max(300).optional()).nullable().optional(),
  imageUrl: z.string().url("Geçerli bir görsel URL girin"),

  // Prisma'da alan yoksa bu satırları kaldır.
  mobileImageUrl: z.preprocess(emptyToUndef, z.string().url().optional()).nullable().optional(),

  // Geri uyumluluk: ctas veya buttons
  ctas: ButtonsInputSchema.optional(),
  buttons: ButtonsInputSchema.optional(),

  isActive: z.coerce.boolean().default(true),
  startsAt: z.preprocess(emptyToUndef, z.string().datetime().optional()).nullable().optional(),
  endsAt: z.preprocess(emptyToUndef, z.string().datetime().optional()).nullable().optional(),

  order: z.coerce.number().int().optional(),
});

/* ---------------- GET: list slides ---------------- */

export async function GET(req: NextRequest) {
  try {
    await assertAdminApi();

    const url = new URL(req.url);
    const q = url.searchParams.get("q") || "";
    const take = Math.min(parseInt(url.searchParams.get("take") || "20", 10) || 20, 100);
    const skip = Math.max(parseInt(url.searchParams.get("skip") || "0", 10) || 0, 0);

    const where = q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { subtitle: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.heroSlide.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        take,
        skip,
        select: {
          id: true,
          title: true,
          subtitle: true,
          imageUrl: true,
          mobileImageUrl: true, // Prisma'da yoksa kaldır
          buttons: true,
          isActive: true,
          startsAt: true,
          endsAt: true,
          order: true,
          createdAt: true,
          updatedAt: true,
        },
      } as any),
      prisma.heroSlide.count({ where } as any),
    ]);

    const safe = items.map((x: any) => ({
      ...x,
      createdAt: x.createdAt instanceof Date ? x.createdAt.toISOString() : x.createdAt,
      updatedAt: x.updatedAt instanceof Date ? x.updatedAt.toISOString() : x.updatedAt,
      startsAt: x.startsAt ? (x.startsAt instanceof Date ? x.startsAt.toISOString() : x.startsAt) : null,
      endsAt: x.endsAt ? (x.endsAt instanceof Date ? x.endsAt.toISOString() : x.endsAt) : null,
    }));

    return ok({ data: { items: safe, total, take, skip } });
  } catch (e: any) {
    return fail(e?.message || "Internal Server Error", 500, e);
  }
}

/* ---------------- POST: create slide ---------------- */

export async function POST(req: NextRequest) {
  try {
    const me = await assertAdminApi();
    await ensureCsrf(req);

    const raw = await req.json().catch(() => null);
    const parsed = SlideCreateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "ValidationError", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // buttons > ctas (geriye uyum)
    const finalButtons = (data.buttons?.length ? data.buttons : data.ctas) ?? [];

    const created = await prisma.heroSlide.create({
      data: {
        title: data.title,
        subtitle: data.subtitle ?? null,
        imageUrl: data.imageUrl,
        mobileImageUrl: data.mobileImageUrl ?? null, // Prisma'da yoksa kaldır
        buttons: finalButtons as any,
        isActive: data.isActive,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        order: data.order ?? null,
      } as any,
      select: {
        id: true,
        title: true,
        subtitle: true,
        imageUrl: true,
        mobileImageUrl: true, // Prisma'da yoksa kaldır
        buttons: true,
        isActive: true,
        startsAt: true,
        endsAt: true,
        order: true,
        createdAt: true,
        updatedAt: true,
      },
    } as any);

    try {
      await logAdminAction?.({
        adminId: me.id,
        action: "HERO_SLIDE_CREATE",
        entity: "HeroSlide",
        entityId: created.id,
        message: `Created hero slide ${created.id}`,
        meta: { isActive: created.isActive },
        path: "/api/admin/hero",
      });
    } catch {}

    const safe = {
      ...created,
      createdAt: (created.createdAt as Date).toISOString(),
      updatedAt: (created.updatedAt as Date).toISOString(),
      startsAt: created.startsAt ? (created.startsAt as Date).toISOString() : null,
      endsAt: created.endsAt ? (created.endsAt as Date).toISOString() : null,
    };

    return NextResponse.json({ ok: true, slide: safe }, { status: 201 });
  } catch (e: any) {
    return fail(e?.message || "Internal Server Error", 500, e);
  }
}
