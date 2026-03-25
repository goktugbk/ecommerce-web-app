// src/lib/cart.ts
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const CART_COOKIE = "cartId";

/**
 * Cookie içindeki cartId'yi getirir. Yoksa null.
 */
export function getCartIdFromCookie(): string | null {
  const jar = cookies();
  return jar.get(CART_COOKIE)?.value ?? null;
}

function setCartCookie(id: string) {
  const jar = cookies();
  jar.set(CART_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 gün
  });
}

export async function ensureCart() {
  const cookieId = getCartIdFromCookie();

  if (cookieId) {
    const existing = await prisma.cart.findUnique({
      where: { id: cookieId },
      select: { id: true },
    });
    if (existing) return existing;

    // Cookie var ama DB'de yok -> yeni sepet oluştur
    const created = await prisma.cart.create({
      data: {},
      select: { id: true },
    });
    setCartCookie(created.id);
    return created;
  }

  // Cookie yok -> yeni sepet oluştur
  const created = await prisma.cart.create({
    data: {},
    select: { id: true },
  });
  setCartCookie(created.id);
  return created;
}

export async function getCartWithItems() {
  const id = getCartIdFromCookie();
  if (!id) return null;

  return prisma.cart.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { createdAt: "desc" },
        include: {
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
}
