"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-server";

/* ------------------------------------------------
   Yardımcılar
-------------------------------------------------*/
function toNum(x: unknown): number {
  if (typeof x === "number") return x;
  const anyX = x as any;
  if (anyX && typeof anyX.toNumber === "function") {
    try {
      return anyX.toNumber();
    } catch {}
  }
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function getCartIdFromCookie(): string | null {
  return cookies().get("cartId")?.value ?? null;
}

const ADDR_COOKIE = "checkout_addr";

type AddressDraft = {
  firstName: string;
  lastName: string;
  line1: string;
  line2?: string;
  city: string;
  district: string;
  postal?: string;
  phone: string;
  email?: string;
  saveForNext?: boolean;
};

function readAddrFromForm(formData: FormData): AddressDraft {
  return {
    firstName: (formData.get("firstName") ?? "").toString(),
    lastName: (formData.get("lastName") ?? "").toString(),
    line1: (formData.get("line1") ?? "").toString(),
    line2: (formData.get("line2") ?? "").toString() || undefined,
    city: (formData.get("city") ?? "").toString(),
    district: (formData.get("district") ?? "").toString(),
    postal: (formData.get("postal") ?? "").toString() || undefined,
    phone: (formData.get("phone") ?? "").toString(),
    // e-posta alanını formdan kaldırdıysan bu undefined kalır; placeOrder me.email’e düşer
    email: (formData.get("email") ?? "").toString() || undefined,
    saveForNext: (formData.get("saveForNext") ?? "1").toString().trim() ? true : false,
  };
}

function setAddrDraftCookie(addr: AddressDraft) {
  cookies().set(
    ADDR_COOKIE,
    encodeURIComponent(JSON.stringify(addr)),
    { path: "/", sameSite: "lax", httpOnly: false, maxAge: 60 * 60 }, // 1 saat
  );
}

function getAddrDraftFromCookie(): AddressDraft | null {
  const raw = cookies().get(ADDR_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as AddressDraft;
  } catch {
    return null;
  }
}

/** Sipariş kodu üretici: YYYYMMDD-XXXXXX */
function genOrderCode(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${y}${m}${d}-${rand}`; // ör. 20250913-AB12CD
}

/* ------------------------------------------------
   1) Adres -> Kargoya Geç
   - savedAddressId varsa DB’den oku ve cookie’ye yaz
   - yoksa form alanlarını kullan
-------------------------------------------------*/
export async function proceedToShippingAction(
  _prevState: unknown,
  formData: FormData,
) {
  const sessionId = (formData.get("sessionId") ?? "").toString();
  const retInfo = `/checkout?id=${encodeURIComponent(sessionId)}&step=info`;

  const me = await getSessionUser();
  if (!me) redirect(`/account/login?returnTo=${encodeURIComponent(retInfo)}`);

  // Opsiyonel: kayıtlı adres kullanımı
  const savedAddressId = (formData.get("savedAddressId") ?? "").toString().trim();

  let addr: AddressDraft;

  if (savedAddressId) {
    // Kullanıcıya ait mi kontrol ederek güvenli şekilde çek
    const a = await prisma.address.findFirst({
      where: { id: savedAddressId, userId: me.id },
      select: {
        line1: true,
        line2: true,
        city: true,
        state: true,      // ilçe/semt
        postal: true,
        // isim/telefon address modelinde yoksa formdakini koruyacağız
      },
    });

    // Formdan gelen first/last/phone değerlerini koru (UI bu alanları gösteriyor)
    const fallback = readAddrFromForm(formData);

    if (a) {
      addr = {
        firstName: fallback.firstName,
        lastName: fallback.lastName,
        phone: fallback.phone,
        line1: a.line1,
        line2: a.line2 ?? undefined,
        city: a.city,
        district: a.state,
        postal: a.postal ?? undefined,
        email: fallback.email,
        saveForNext: fallback.saveForNext,
      };
    } else {
      // id geçersizse form alanlarına düş
      addr = fallback;
    }
  } else {
    addr = readAddrFromForm(formData);
  }

  setAddrDraftCookie(addr);

  // Kullanıcı login ise, sepete userId’yi iliştir (misafir sepeti kalmasın)
  const cartId = getCartIdFromCookie();
  if (cartId) {
    try {
      const cart = await prisma.cart.findUnique({
        where: { id: cartId },
        select: { userId: true },
      });
      if (!cart?.userId) {
        await prisma.cart.update({
          where: { id: cartId },
          data: { userId: me.id },
        });
      }
    } catch {}
  }

  // Client tarafında useActionState ile okunan state
  return { ok: true, step: "shipping" as const, sessionId };
}

/* ------------------------------------------------
   2) Siparişi Tamamla
-------------------------------------------------*/
type PlaceOrderResult =
  | { ok: true; orderId: string; redirectUrl?: string }
  | { ok: false; message?: string };

export async function placeOrder(payload: {
  addr?: AddressDraft;
  shippingId: string;
  paymentId: string;
}): Promise<PlaceOrderResult> {
  try {
    const me = await getSessionUser();
    const cartId = getCartIdFromCookie();

    if (!me) {
      const ret = `/checkout?id=${encodeURIComponent(cartId ?? "")}&step=info`;
      redirect(`/account/login?returnTo=${encodeURIComponent(ret)}`);
    }
    if (!cartId) return { ok: false, message: "Sepet bulunamadı." };

    // Sepeti kullanıcıya iliştir (güvence)
    try {
      const cart = await prisma.cart.findUnique({
        where: { id: cartId },
        select: { userId: true },
      });
      if (!cart?.userId) {
        await prisma.cart.update({
          where: { id: cartId },
          data: { userId: me!.id },
        });
      }
    } catch {}

    const addr = payload.addr ?? getAddrDraftFromCookie();
    if (!addr) return { ok: false, message: "Adres bilgisi eksik." };

    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      select: {
        items: {
          select: {
            id: true,
            quantity: true,
            productId: true,
            unitPrice: true,
            product: {
              select: { id: true, price: true, currency: true, isActive: true },
            },
          },
        },
      },
    });
    if (!cart || cart.items.length === 0) {
      return { ok: false, message: "Sepet boş." };
    }

    const activeItems = cart.items.filter((it) => it.product?.isActive);
    if (!activeItems.length) {
      return { ok: false, message: "Sepette geçerli ürün yok." };
    }

    const shippingFee =
      payload.shippingId === "ship-exp"
        ? 89.9
        : payload.shippingId === "ship-std"
          ? 49.9
          : 49.9;

    const subtotal = activeItems.reduce((s, it) => {
      const unit = toNum(it.unitPrice ?? it.product?.price);
      return s + unit * it.quantity;
    }, 0);

    const grandTotal = subtotal + shippingFee;
    const currency = activeItems[0]?.product?.currency ?? "TRY";

    const orderId = await prisma.$transaction(async (tx) => {
      // (İsteğe bağlı) Adresi kullanıcıya kaydet
      try {
        await tx.address.create({
          data: {
            userId: me!.id,
            line1: addr.line1,
            line2: addr.line2 ?? null,
            city: addr.city,
            state: addr.district, // ilçe/semt
            postal: addr.postal ?? null,
            country: "TR",
            isDefault: !!addr.saveForNext, // işaretliyse varsayılan yap
          },
        });
      } catch {}

      // E-posta: formdaki varsa onu, yoksa login kullanıcının mailini kullan
      const preferEmail: string | null =
        (addr.email && addr.email.trim()) || (me as any)?.email || null;

      // ---- ORDER + SNAPSHOT ----
      const order = await tx.order.create({
        data: {
          userId: me!.id,
          totalAmount: grandTotal as any, // Decimal(10,2)
          currency,
          status: "PENDING",
          paymentId: payload.paymentId,
          shipmentId: payload.shippingId,
          orderCode: genOrderCode(), // benzersiz kod

          /* ---- İLETİŞİM SNAPSHOT ---- */
          contactName: `${addr.firstName} ${addr.lastName}`.trim(),
          contactEmail: preferEmail,
          contactPhone: addr.phone,

          /* ---- TESLİMAT SNAPSHOT (SHIP) ---- */
          shipFirstName: addr.firstName,
          shipLastName: addr.lastName,
          shipPhone: addr.phone,
          shipEmail: preferEmail,
          shipLine1: addr.line1,
          shipLine2: addr.line2 ?? null,
          shipDistrict: addr.district,
          shipCity: addr.city,
          shipPostal: addr.postal ?? null,
          shipCountry: "TR",

          /* ---- FATURA SNAPSHOT (BILL): şimdilik ship ile aynı ---- */
          billFirstName: addr.firstName,
          billLastName: addr.lastName,
          billPhone: addr.phone,
          billEmail: preferEmail,
          billLine1: addr.line1,
          billLine2: addr.line2 ?? null,
          billDistrict: addr.district,
          billCity: addr.city,
          billPostal: addr.postal ?? null,
          billCountry: "TR",
        },
        select: { id: true },
      });

      // Kalemler
      for (const it of activeItems) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: it.productId,
            quantity: it.quantity,
            unitPrice: (it.unitPrice ?? it.product?.price) as any,
          },
        });
      }

      // Sepeti boşalt
      await tx.cartItem.deleteMany({ where: { cartId } });

      return order.id;
    });

    // Draft cookie temizle
    try {
      cookies().delete(ADDR_COOKIE);
    } catch {}

    return { ok: true, orderId, redirectUrl: `/order/${orderId}` };
  } catch (e: any) {
    console.error("placeOrder error:", e);
    return { ok: false, message: e?.message ?? "Sipariş oluşturulamadı." };
  }
}
