// src/app/api/cart/count/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

const CART_COOKIE = "cartId";

export async function GET() {
  try {
    const jar = cookies();
    const cartId = jar.get(CART_COOKIE)?.value;
    if (!cartId) {
      return NextResponse.json(
        { count: 0 },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const agg = await prisma.cartItem.aggregate({
      where: { cartId },
      _sum: { quantity: true },
    });

    return NextResponse.json(
      { count: agg._sum.quantity ?? 0 },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { count: 0 },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
