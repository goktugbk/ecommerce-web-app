"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

type CartItemPayload = {
  id: string;
  productId: string;
  slug: string;
  title: string;
  price: number;     // birim fiyat
  currency: string;  // "TRY" vb.
  quantity: number;
  image?: string | null;
};

export async function startCheckoutAction(formData: FormData) {
  const c = cookies();

  // 1) Session ID cookie'sini garanti et (native, paketsiz)
  let sessionId = c.get("sessionId")?.value;
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    c.set("sessionId", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 gün
      secure: process.env.NODE_ENV === "production",
    });
  }

  // 2) Client'tan gelen sepet (localStorage -> hidden input)
  const raw = formData.get("payload");
  let items: CartItemPayload[] = [];
  if (typeof raw === "string" && raw.trim()) {
    try {
      items = JSON.parse(raw) as CartItemPayload[];
    } catch {}
  }

  // Eğer items boşsa DB'de olanı kontrol ederiz; ama amaç client'i DB'ye senk etmek.
  // 3) Bu session'a ait aktif Cart'ı bul/yoksa oluştur
  let cart = await prisma.cart.findFirst({
    where: { sessionId },
    select: { id: true },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { sessionId },
      select: { id: true },
    });
  }

  // 4) Gelen item'ları DB'ye yaz (mevcut satırları temizleyip yeniden ekleme)
  // CartItem şeman (cartId, productId, quantity, unitPrice ...) şeklinde olduğu için buna göre yazıyoruz.
  // Dilersen "sil & ekle" yerine upsert da yapabilirsin.
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

  if (items.length > 0) {
    await prisma.cartItem.createMany({
      data: items.map((it) => ({
        cartId: cart!.id,
        productId: it.productId,
        quantity: Number(it.quantity || 0),
        // unitPrice alanın DecimalNullable ise:
        unitPrice: Number(it.price ?? 0),
      })),
      skipDuplicates: true,
    });
  }

  // 5) DB'de item kaldı mı kontrol et; yoksa cart'a dön
  const itemCount = await prisma.cartItem.count({
    where: { cartId: cart.id },
  });

  if (itemCount === 0) {
    redirect("/cart?empty=1");
  }

  // 6) (Opsiyonel) CheckoutSession kaydı/bağlantısı burada açılabilir

  // 7) Sorunsuzsa checkout'a
  redirect("/checkout");
}
