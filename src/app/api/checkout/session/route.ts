import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

function json(body: any, status = 200) {
  const r = NextResponse.json(body, { status });
  r.headers.set("Cache-Control", "no-store");
  return r;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") ?? "";
    if (!id) return json({ error: "id gerekli" }, 400);

    const cartId = cookies().get("cartId")?.value ?? null;
    if (!cartId) return json({ error: "Sepet bulunamadı" }, 400);

    const session = await prisma.checkoutSession.findUnique({
      where: { id },
      include: {
        Cart: {
          include: {
            items: {
              include: {
                product: {
                  select: {
                    title: true,
                    slug: true,
                    price: true,
                    currency: true,
                    images: { select: { url: true, isPrimary: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session) return json({ error: "Oturum yok" }, 404);
    if (session.cartId !== cartId) return json({ error: "Yetkisiz" }, 403);
    if (session.status !== "PENDING")
      return json({ error: "Oturum geçersiz" }, 400);
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      await prisma.checkoutSession.update({
        where: { id },
        data: { status: "EXPIRED" },
      });
      return json({ error: "Oturum süresi doldu" }, 400);
    }

    const items = session.Cart.items.map((it) => {
      const p = it.product;
      const img =
        p.images.find((i) => i.isPrimary)?.url || p.images[0]?.url || null;
      return {
        id: it.id,
        productId: it.productId,
        slug: p.slug,
        title: p.title,
        price: Number(p.price),
        currency: p.currency ?? "TRY",
        quantity: it.quantity,
        image: img,
      };
    });

    const subtotal = items.reduce((a, i) => a + i.price * i.quantity, 0);
    return json({
      ok: true,
      session: { id: session.id, expiresAt: session.expiresAt },
      items,
      subtotal,
      currency: items[0]?.currency ?? "TRY",
    });
  } catch (e: any) {
    return json({ error: e?.message || "Server error" }, 500);
  }
}
