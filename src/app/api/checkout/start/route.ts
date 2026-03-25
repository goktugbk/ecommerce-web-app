import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";

function json(body: any, status = 200) {
  const r = NextResponse.json(body, { status });
  r.headers.set("Cache-Control", "no-store");
  return r;
}

export async function POST() {
  try {
    const cartId = cookies().get("cartId")?.value ?? null;
    if (!cartId) return json({ error: "Sepet bulunamadı" }, 400);

    // Sepet boş mu?
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      select: { items: { select: { quantity: true } } },
    });
    const count = (cart?.items ?? []).reduce((a, i) => a + i.quantity, 0);
    if (count === 0) return json({ error: "Sepet boş" }, 400);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 45 * 60 * 1000); // 45 dakika

    const h = headers();
    const session = await prisma.checkoutSession.create({
      data: {
        cartId,
        expiresAt,
        clientIp: h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? null,
        userAgent: h.get("user-agent") ?? null,
      },
      select: { id: true, expiresAt: true },
    });

    const url = `/checkout?id=${encodeURIComponent(session.id)}&step=info`;
    return json({
      ok: true,
      id: session.id,
      url,
      expiresAt: session.expiresAt.toISOString(),
    });
  } catch (e: any) {
    return json({ error: e?.message || "Server error" }, 500);
  }
}
