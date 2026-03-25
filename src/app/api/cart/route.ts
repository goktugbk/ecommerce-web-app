// src/app/api/cart/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const CART_COOKIE = "cartId";

// ---- Helpers ----
function jsonNoStore(body: any, init?: { status?: number }) {
  const res = NextResponse.json(body, { status: init?.status ?? 200 });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

function toNum(x: any) {
  if (x && typeof x === "object" && typeof (x as any).toNumber === "function") {
    try {
      return (x as any).toNumber();
    } catch {}
  }
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function getCartId(): string | null {
  return cookies().get(CART_COOKIE)?.value ?? null;
}

function setCartCookie(id: string) {
  cookies().set(CART_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 gün
  });
}

function clearCartCookie() {
  cookies().set(CART_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

async function ensureCartId(): Promise<string> {
  const cookieId = getCartId();
  if (cookieId) {
    const exists = await prisma.cart.findUnique({
      where: { id: cookieId },
      select: { id: true },
    });
    if (exists) return cookieId;
    // Cookie var ama DB’de yok → yeni oluştur
    const created = await prisma.cart.create({
      data: {},
      select: { id: true },
    });
    setCartCookie(created.id);
    return created.id;
  }
  // Cookie yok → yeni oluştur
  const created = await prisma.cart.create({ data: {}, select: { id: true } });
  setCartCookie(created.id);
  return created.id;
}

// ========================
//        GET /api/cart
// ========================
export async function GET() {
  try {
    const cartId = getCartId();
    if (!cartId) {
      return jsonNoStore({
        ok: true,
        items: [],
        subtotal: 0,
        total: 0,
        currency: "TRY",
      });
    }

    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      select: {
        id: true,
        items: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            product: {
              select: {
                id: true,
                slug: true,
                title: true,
                price: true,
                currency: true,
                images: {
                  select: { url: true, isPrimary: true, isHover: true },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      // Stale cookie temizle
      clearCartCookie();
      return jsonNoStore({
        ok: true,
        items: [],
        subtotal: 0,
        total: 0,
        currency: "TRY",
      });
    }

    const items = (cart.items ?? []).map((ci) => {
      const p = ci.product;
      const price = toNum(ci.unitPrice ?? p.price);
      const primary =
        p.images.find((i) => i.isPrimary)?.url || p.images[0]?.url || null;
      const hover = p.images.find((i) => i.isHover)?.url || null;

      return {
        id: ci.id,
        productId: p.id,
        slug: p.slug,
        title: p.title,
        price,
        currency: p.currency ?? "TRY",
        quantity: ci.quantity,
        image: primary,
        hoverImage: hover,
      };
    });

    const subtotal = items.reduce(
      (acc, it) => acc + toNum(it.price) * toNum(it.quantity),
      0,
    );
    const total = subtotal; // kargo/indirim/vergi burada eklenebilir
    const currency = items[0]?.currency ?? "TRY";

    return jsonNoStore({ ok: true, items, subtotal, total, currency });
  } catch (e: any) {
    console.error("GET /api/cart error:", e);
    return jsonNoStore(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}

// =========================
//       POST /api/cart
//   (Sepete ürün ekle)
// =========================
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const productId = body?.productId as string | undefined;
    let qty = Math.max(1, Number(body?.quantity ?? 1));

    if (!productId)
      return jsonNoStore({ error: "productId gerekli" }, { status: 400 });
    if (!Number.isInteger(qty) || qty < 1) qty = 1;
    if (qty > 99) qty = 99;

    // Ürün kontrolü
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        title: true,
        price: true,
        currency: true,
        isActive: true,
        inventory: { select: { quantity: true } },
      },
    });
    if (!product)
      return jsonNoStore({ error: "Ürün bulunamadı" }, { status: 404 });
    if (product.isActive === false)
      return jsonNoStore({ error: "Ürün aktif değil" }, { status: 400 });

    // Stok sınırı
    if (product.inventory) {
      const avail = Math.max(0, product.inventory.quantity);
      if (avail <= 0)
        return jsonNoStore({ error: "Stok yok" }, { status: 400 });
      if (qty > avail) qty = avail;
    }

    // Cookie'den cartId al; yoksa oluştur. Varsa da DB'de olduğundan emin ol.
    let cartId = getCartId();
    const txResult = await prisma.$transaction(async (tx) => {
      // Cart doğrula
      if (cartId) {
        const exists = await tx.cart.findUnique({
          where: { id: cartId },
          select: { id: true },
        });
        if (!exists) cartId = null; // stale cookie
      }
      if (!cartId) {
        const created = await tx.cart.create({
          data: {},
          select: { id: true },
        });
        cartId = created.id;
        // DİKKAT: cookie set'i transaction dışında yapacağız
      }

      // Aynı ürün varsa miktarı arttır, yoksa oluştur
      // Şema: @@unique([cartId, productId], name: "cartId_productId")
      const existing = await tx.cartItem.findUnique({
        where: { cartId_productId: { cartId: cartId!, productId: product.id } },
        select: { id: true, quantity: true },
      });

      if (existing) {
        let inc = qty;
        if (product.inventory) {
          // Max stok sınırı
          const maxAdd = Math.max(
            0,
            product.inventory.quantity - existing.quantity,
          );
          inc = Math.min(inc, maxAdd);
          if (inc <= 0) return { updated: false };
        }
        await tx.cartItem.update({
          where: { id: existing.id },
          data: { quantity: { increment: inc } },
        });
        return { updated: true };
      } else {
        const initQty = product.inventory
          ? Math.max(1, Math.min(qty, product.inventory.quantity))
          : qty;
        await tx.cartItem.create({
          data: {
            cartId: cartId!,
            productId: product.id,
            quantity: initQty,
            unitPrice: product.price as any, // Decimal alan
          },
        });
        return { created: true };
      }
    });

    // Cookie'yi transaction SONRASI set et (cart yeni oluştuysa)
    if (cartId && getCartId() !== cartId) {
      cookies().set(CART_COOKIE, cartId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return jsonNoStore({ ok: true, ...txResult });
  } catch (e: any) {
    console.error("POST /api/cart error:", e);
    return jsonNoStore(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}

// ===========================
//      PATCH /api/cart
//  (Kalem miktarı güncelle)
// ===========================
export async function PATCH(req: Request) {
  try {
    const { itemId, quantity } = (await req.json().catch(() => ({}))) as {
      itemId?: string;
      quantity?: number;
    };
    if (!itemId)
      return jsonNoStore({ error: "itemId gerekli" }, { status: 400 });

    let qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 0 || qty > 99) {
      return jsonNoStore({ error: "Geçersiz miktar" }, { status: 400 });
    }

    const cartId = await ensureCartId();

    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        product: { select: { inventory: { select: { quantity: true } } } },
      },
    });
    if (!item || item.cartId !== cartId) {
      return jsonNoStore({ error: "Bulunamadı" }, { status: 404 });
    }

    const invQty = item.product?.inventory?.quantity;
    if (typeof invQty === "number") {
      qty = Math.min(qty, Math.max(0, invQty));
    }

    if (qty === 0) {
      await prisma.cartItem.delete({ where: { id: item.id } });
    } else {
      await prisma.cartItem.update({
        where: { id: item.id },
        data: { quantity: qty },
      });
    }

    return jsonNoStore({ ok: true });
  } catch (e: any) {
    console.error("PATCH /api/cart error:", e);
    return jsonNoStore(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}

// ============================
//      DELETE /api/cart
//    (Kalem sil / remove)
// ============================
export async function DELETE(req: Request) {
  try {
    const { itemId } = (await req.json().catch(() => ({}))) as {
      itemId?: string;
    };
    if (!itemId)
      return jsonNoStore({ error: "itemId gerekli" }, { status: 400 });

    const cartId = await ensureCartId();

    const item = await prisma.cartItem.findUnique({ where: { id: itemId } });
    if (!item || item.cartId !== cartId) {
      return jsonNoStore({ error: "Bulunamadı" }, { status: 404 });
    }

    await prisma.cartItem.delete({ where: { id: itemId } });
    return jsonNoStore({ ok: true });
  } catch (e: any) {
    console.error("DELETE /api/cart error:", e);
    return jsonNoStore(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}
