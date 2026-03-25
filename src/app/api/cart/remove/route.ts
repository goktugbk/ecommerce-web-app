import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { noStoreJson, prisma } from "@/lib/server";

export async function PATCH(req: NextRequest) {
  try {
    const cartId = cookies().get("cartId")?.value ?? null;
    if (!cartId)
      return noStoreJson({ error: "Sepet bulunamadı" }, { status: 400 });

    const body = await req.json().catch(() => null);
    const itemId = typeof body?.itemId === "string" ? body.itemId.trim() : "";
    let quantity = Number.isFinite(body?.quantity)
      ? Number(body.quantity)
      : NaN;

    if (!itemId)
      return noStoreJson({ error: "itemId gerekli" }, { status: 400 });
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 99)
      return noStoreJson({ error: "Geçersiz miktar" }, { status: 400 });

    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cartId },
      include: { product: { select: { stock: true } } } as any,
    });
    if (!item)
      return noStoreJson({ error: "Kalem bulunamadı" }, { status: 404 });

    if (typeof (item.product as any)?.stock === "number") {
      quantity = Math.min(
        quantity,
        Math.max(0, (item.product as any).stock as number),
      );
    }

    if (quantity === 0) {
      await prisma.cartItem.delete({ where: { id: item.id } });
    } else {
      await prisma.cartItem.update({
        where: { id: item.id },
        data: { quantity },
      });
    }

    return noStoreJson({ ok: true });
  } catch (e: any) {
    return noStoreJson(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}
