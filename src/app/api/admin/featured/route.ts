import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertAdminApi } from "@/lib/auth-server";

export async function GET() {
  // admin doğrulama (401/403 gerekirse kendisi atar)
  await assertAdminApi();

  try {
    const products = await prisma.product.findMany({
      include: { images: true },
      orderBy: [
        { isFeatured: "desc" },
        { featuredOrder: "asc" },
        { createdAt: "desc" },
      ],
      take: 200,
    });

    const items = products.map((p) => {
      const primary =
        p.images.find((i) => i.isPrimary)?.url || p.images[0]?.url || null;
      const safe =
        primary && primary.startsWith("http://")
          ? primary.replace("http://", "https://")
          : primary;

      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        price: Number(p.price),
        currency: p.currency,
        image: safe,
        isActive: p.isActive,
        isFeatured: p.isFeatured,
        featuredOrder: p.featuredOrder,
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch (err: any) {
    console.error("Admin products list error:", err);
    return NextResponse.json(
      { ok: false, error: "ListFailed", message: err?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}
