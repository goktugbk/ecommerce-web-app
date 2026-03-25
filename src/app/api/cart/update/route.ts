import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { noStoreJson, prisma, toNumber } from "@/lib/server";

const COOKIE = "cartId";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 gün

export async function POST(req: NextRequest) {
  try {
    const jar = cookies();
    const body = await req.json().catch(() => null);
    const productId =
      typeof body?.productId === "string" ? body.productId.trim() : "";
    let quantity = Number.isFinite(body?.quantity) ? Number(body.quantity) : 1;

    if (!productId)
      return noStoreJson({ error: "productId gerekli" }, { status: 400 });
    if (!Number.isInteger(quantity) || quantity < 1) quantity = 1;
    if (quantity > 99) quantity = 99;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        title: true,
        price: true,
        currency: true,
        imageUrl: true,
        stock: true,
        active: true,
      } as any,
    });
    if (!product)
      return noStoreJson({ error: "Ürün bulunamadı" }, { status: 404 });
    if (
      typeof (product as any).active === "boolean" &&
      !(product as any).active
    )
      return noStoreJson({ error: "Ürün aktif değil" }, { status: 400 });

    if (typeof (product as any).stock === "number") {
      const avail = Math.max(0, (product as any).stock as number);
      if (avail <= 0)
        return noStoreJson({ error: "Stok yok" }, { status: 400 });
      if (quantity > avail) quantity = avail;
    }

    let cartId = jar.get(COOKIE)?.value ?? null;
    if (!cartId) {
      const created = await prisma.cart.create({
        data: {},
        select: { id: true },
      });
      cartId = created.id;
      jar.set({
        name: COOKIE,
        value: cartId,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: MAX_AGE,
      });
    }

    const existing = await prisma.cartItem.findFirst({
      where: { cartId, productId },
      select: { id: true, quantity: true },
    });
    if (existing) {
      let finalQty = existing.quantity + quantity;
      if (typeof (product as any).stock === "number")
        finalQty = Math.min(
          finalQty,
          Math.max(0, (product as any).stock as number),
        );
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: finalQty },
      });
    } else {
      await prisma.cartItem.create({
        data: { cartId, productId: product.id, quantity },
      });
    }

    return noStoreJson({ ok: true, cartId });
  } catch (e: any) {
    return noStoreJson(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}
