// src/app/api/checkout-sessions/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
    },
  });
}

export async function POST() {
  try {
    const jar = cookies();
    const cartId = jar.get("cartId")?.value ?? null;
    if (!cartId) {
      return NextResponse.json(
        { ok: false, message: "Sepet bulunamadı (cookie yok)." },
        { status: 400 },
      );
    }

    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      select: { userId: true, items: { select: { id: true } } },
    });

    if (!cart) {
      return NextResponse.json(
        { ok: false, message: "Sepet bulunamadı (DB)." },
        { status: 404 },
      );
    }
    if (!cart.items.length) {
      return NextResponse.json(
        { ok: false, message: "Sepet boş." },
        { status: 400 },
      );
    }

    await prisma.checkoutSession.updateMany({
      where: { cartId, status: "OPEN" },
      data: { status: "CANCELLED" },
    });

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 dk
    const session = await prisma.checkoutSession.create({
      data: {
        userId: cart.userId ?? "guest",
        cartId,
        status: "OPEN",
        expiresAt,
      },
      select: { id: true },
    });

    return NextResponse.json(
      {
        ok: true,
        sessionId: session.id,
        url: `/checkout?id=${session.id}&step=info`,
      },
      { status: 201 },
    );
  } catch (e: any) {
    console.error("POST /api/checkout-sessions error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Sunucu hatası." },
      { status: 500 },
    );
  }
}

export async function GET() {
  // Bilerek JSON dönüyoruz (HTML düşmesin)
  return NextResponse.json(
    { ok: false, message: "Method Not Allowed" },
    { status: 405 },
  );
}
