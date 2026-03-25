// src/app/api/orders/route.ts
import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-server";
import { z } from "zod";

/* ---------------------- Zod Schemas ---------------------- */

const ZAddress = z.object({
  firstName: z.string().min(1, "Ad zorunlu"),
  lastName: z.string().min(1, "Soyad zorunlu"),
  line1: z.string().min(5, "Adres satırı kısa"),
  line2: z.string().optional(),
  city: z.string().min(1, "Şehir zorunlu"),
  district: z.string().min(1, "İlçe zorunlu"),
  postal: z.string().optional(),
  phone: z.string().regex(/^\+?[\d\s()-]{8,}$/, "Telefon formatı hatalı"),
  email: z.string().email("E-posta hatalı").optional(),
  saveForNext: z.boolean().optional(),
});

const ZPayload = z.object({
  addr: ZAddress,
  shippingId: z.string().min(1, "Kargo seçilmedi"),
  paymentId: z.string().min(1, "Ödeme yöntemi seçilmedi"),
  sessionId: z.string().min(1, "sessionId eksik"),
});

type Result =
  | { ok: true; orderId: string; redirectUrl?: string }
  | { ok: false; message?: string; needLogin?: boolean };

/* ---------------------- Helpers ---------------------- */

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

function json(body: Result | any, init?: { status?: number }) {
  const res = NextResponse.json(body, { status: init?.status ?? 200 });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

/** Basit sipariş kodu üretici: YYYYMMDD-XXXXXX (ör. 20250913-AB12CD) */
function genOrderCode(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${y}${m}${d}-${rand}`;
}

/* ---------------------- POST: Sipariş oluştur ---------------------- */

export async function POST(req: Request) {
  try {
    // Basit CSRF: Origin/Host kontrolü
    const h = headers();
    const origin = h.get("origin");
    const host = h.get("host");
    if (!origin || !host || !origin.includes(host)) {
      return json({ ok: false, message: "Geçersiz istek" }, { status: 403 });
    }

    // Gövde doğrulama (Zod)
    const raw = await req.json().catch(() => null);
    const parsed = ZPayload.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(", ");
      return json(
        { ok: false, message: msg || "Geçersiz istek" },
        { status: 400 },
      );
    }
    const body = parsed.data;

    // cartId (cookie)
    const jar = cookies();
    const cartId = jar.get("cartId")?.value ?? null;
    if (!cartId)
      return json({ ok: false, message: "Sepet yok." }, { status: 400 });

    // CheckoutSession doğrula
    const cs = await prisma.checkoutSession.findUnique({
      where: { id: body.sessionId },
    });
    if (!cs)
      return json(
        { ok: false, message: "Oturum bulunamadı." },
        { status: 404 },
      );
    if (cs.cartId !== cartId)
      return json(
        { ok: false, message: "Sepet uyuşmazlığı." },
        { status: 403 },
      );
    if (cs.status !== "PENDING")
      return json({ ok: false, message: "Oturum geçersiz." }, { status: 409 });
    if (new Date(cs.expiresAt).getTime() < Date.now()) {
      await prisma.checkoutSession.update({
        where: { id: cs.id },
        data: { status: "EXPIRED" },
      });
      return json(
        { ok: false, message: "Oturum zaman aşımı." },
        { status: 410 },
      );
    }

    // Sepeti çek (kullanıcı opsiyonel)
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
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
        user: { select: { id: true } },
      },
    });

    if (!cart || !cart.items.length) {
      return json({ ok: false, message: "Sepet boş." }, { status: 400 });
    }

    const userId: string | null = cart.user?.id ?? null;

    // Sadece aktif ürünler
    const activeItems = cart.items.filter((it) => it.product?.isActive);
    if (!activeItems.length) {
      return json(
        { ok: false, message: "Sepette geçerli ürün yok." },
        { status: 400 },
      );
    }

    // Kargo ücreti (örnek sabitler)
    const shippingFee =
      body.shippingId === "ship-exp"
        ? 89.9
        : body.shippingId === "ship-std"
          ? 49.9
          : 49.9;

    // Tutar
    const subtotal = activeItems.reduce((s, it) => {
      const unit = toNum(it.unitPrice ?? it.product?.price);
      return s + unit * it.quantity;
    }, 0);
    const grandTotal = subtotal + shippingFee;
    const currency = activeItems[0]?.product?.currency ?? "TRY";

    // --- Sipariş oluştur (orderCode ile) ---
    let createdOrderId: string | null = null;
    for (let attempt = 0; attempt < 3 && !createdOrderId; attempt++) {
      try {
        const orderId = await prisma.$transaction(async (tx) => {
          // Kullanıcı girişliyse ve "kaydet" işaretliyse adresi kaydet
          if (userId && body.addr.saveForNext) {
            try {
              await tx.address.create({
                data: {
                  userId,
                  line1: body.addr.line1,
                  line2: body.addr.line2 ?? null,
                  city: body.addr.city,
                  state: body.addr.district,
                  postal: body.addr.postal ?? null,
                  country: "TR",
                  isDefault: true,
                },
              });
            } catch {}
          }

          const order = await tx.order.create({
            data: {
              ...(userId ? { userId } : {}),
              totalAmount: grandTotal as any,
              currency,
              status: "PENDING",
              paymentId: body.paymentId,
              shipmentId: body.shippingId,
              orderCode: genOrderCode(),

              // ---- İLETİŞİM SNAPSHOT ----
              contactName:
                `${body.addr.firstName} ${body.addr.lastName}`.trim(),
              contactEmail: body.addr.email ?? null,
              contactPhone: body.addr.phone,

              // ---- TESLİMAT SNAPSHOT ----
              shipFirstName: body.addr.firstName,
              shipLastName: body.addr.lastName,
              shipPhone: body.addr.phone,
              shipEmail: body.addr.email ?? null,
              shipLine1: body.addr.line1,
              shipLine2: body.addr.line2 ?? null,
              shipDistrict: body.addr.district,
              shipCity: body.addr.city,
              shipPostal: body.addr.postal ?? null,
              shipCountry: "TR",
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

        createdOrderId = orderId;
      } catch (err: any) {
        const code = err?.code || "";
        const msg = String(err?.message || "");
        if (!(code === "P2002" || /Unique constraint/i.test(msg))) throw err;
      }
    }

    if (!createdOrderId) {
      return json(
        { ok: false, message: "Sipariş kodu üretilemedi." },
        { status: 500 },
      );
    }

    // Oturumu kapat
    await prisma.checkoutSession.update({
      where: { id: cs.id },
      data: { status: "COMPLETED" },
    });

    return json(
      { ok: true, orderId: createdOrderId, redirectUrl: "/thank-you" },
      { status: 201 },
    );
  } catch (e: any) {
    console.error("POST /api/orders error:", e);
    return json(
      { ok: false, message: e?.message ?? "Sipariş oluşturulamadı." },
      { status: 500 },
    );
  }
}

/* ---------------------- GET: Kendi siparişlerimi listele ---------------------- */
/**
 * /api/orders?page=1&size=10
 * Auth zorunlu. Kullanıcının kendi siparişlerini döndürür.
 * Ürün görseli için ProductImage[] -> primary öncelik, sonra id.
 */
export async function GET(req: Request) {
  try {
    const me = await getSessionUser();
    if (!me)
      return json(
        { ok: false, needLogin: true, message: "Giriş gerekli." },
        { status: 401 },
      );

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(
      20,
      Math.max(5, Number(searchParams.get("size") ?? "10")),
    );
    const skip = (page - 1) * pageSize;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId: me.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          orderCode: true,
          status: true,
          totalAmount: true,
          currency: true,
          createdAt: true,
          items: {
            select: {
              id: true,
              productId: true,
              quantity: true,
              unitPrice: true,
              product: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  images: {
                    select: { url: true, isPrimary: true },
                    orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
                    take: 1,
                  },
                },
              },
            },
          },
        },
      }),
      prisma.order.count({ where: { userId: me.id } }),
    ]);

    return json({ ok: true, page, pageSize, total, orders });
  } catch (err) {
    console.error("GET /api/orders error:", err);
    return json(
      { ok: false, message: "Siparişler yüklenemedi." },
      { status: 500 },
    );
  }
}
