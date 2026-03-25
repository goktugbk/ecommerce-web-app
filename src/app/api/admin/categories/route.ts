import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { assertAdminApi } from "@/lib/auth-server";
import { ensureCsrf } from "@/lib/security/csrf";
import { logAdminAction } from "@/lib/audit";

// basit slug normalizasyonu
function normalizeSlug(input: string) {
  return input
    .toLocaleLowerCase("tr-TR")
    .trim()
    .replace(/['"’`]/g, "")            // tırnakları at
    .replace(/[^a-z0-9]+/g, "-")       // harf/rakam dışını tire yap
    .replace(/^-+|-+$/g, "")           // uçlardaki tireleri temizle
    .replace(/-+/g, "-");              // çift tireyi teke indir
}

// boş string'i undefined'a çevir
const emptyToUndef = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const BodySchema = z.object({
  name: z.string().trim().min(1, "Kategori adı gerekli"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug gerekli")
    .transform(normalizeSlug),
  imageUrl: z.preprocess(emptyToUndef, z.string().url().optional()),
  homeFeatured: z.coerce.boolean().optional().default(false),
  homeOrder: z.coerce.number().int().nullable().optional(),
});

// GET /api/admin/categories -> listele
export async function GET() {
  // admin doğrulama (401/403'ü kendisi atar)
  await assertAdminApi();

  const categories = await prisma.category.findMany({
    orderBy: [{ homeFeatured: "desc" }, { homeOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      homeFeatured: true,
      homeOrder: true,
    },
  });

  return NextResponse.json({ ok: true, categories });
}

// POST /api/admin/categories -> yeni kategori oluştur
export async function POST(req: NextRequest) {
  const me = await assertAdminApi(); // { id, email }
  await ensureCsrf(req);

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "ValidationError", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const created = await prisma.category.create({
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

    // audit (varsa)
    try {
      await logAdminAction?.({
        adminId: me.id,
        action: "CATEGORY_CREATE",
        entity: "Category",
        entityId: created.id,
        message: `Created ${created.slug}`,
        meta: created,
      });
    } catch {
      // audit opsiyonel; hata sessiz geçilir
    }

    return NextResponse.json({ ok: true, category: created }, { status: 201 });
  } catch (err: any) {
    // Prisma unique constraint (ör: slug eşsiz)
    if (err?.code === "P2002") {
      return NextResponse.json(
        {
          ok: false,
          error: "UniqueConstraint",
          message: "Slug zaten kullanımda",
          target: err?.meta?.target,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "CreateFailed",
        message: err?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}
