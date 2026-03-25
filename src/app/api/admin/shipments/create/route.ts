// src/app/api/admin/shipments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { assertAdminApi, getSessionUser } from "@/lib/auth-server";
import { ensureCsrf } from "@/lib/security/csrf";
import { logAdminAction } from "@/lib/audit";

/* ----------------------- Helpers ----------------------- */
async function requireAdmin() {
  const me = await getSessionUser();
  if (!me || me.role !== "ADMIN") {
    return {
      ok: false as const,
      res: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true as const, me };
}

function jsonErr(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...(extra ?? {}) }, { status });
}
function jsonOk(body?: Record<string, unknown>, status = 200) {
  return NextResponse.json({ ok: true, ...(body ?? {}) }, { status });
}

/* ----------------------- Schema ----------------------- */
const BodySchema = z.object({
  orderId: z.string().min(1, "orderId zorunlu"),
  carrier: z.string().min(2, "carrier zorunlu"),
  tracking: z.string().trim().optional(),
  labelUrl: z.string().url().optional(),
});

/* ----------------------- POST /admin/shipments ----------------------- */
/**
 * Idempotent upsert:
 * - Shipment yoksa oluşturur
 * - Varsa tracking/labelUrl alanlarını günceller (carrier da güncellenir)
 * - Sipariş durumu PENDING/PAID ise SHIPPED yapılır. CANCELLED/DELIVERED ise değişmez.
 */
export async function POST(req: NextRequest) {
  // Kimlik + CSRF + rol
  const me = await assertAdminApi();
  await ensureCsrf(req);
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonErr("ValidationError", 400, { issues: parsed.error.flatten() });
  }
  const { orderId, carrier, tracking, labelUrl } = parsed.data;

  // Sipariş var mı?
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, orderCode: true },
  });
  if (!order) return jsonErr("OrderNotFound", 404);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // shipment upsert (orderId unique varsayımı)
      const existing = await tx.shipment.findUnique({ where: { orderId } });

      let shipment;
      if (existing) {
        shipment = await tx.shipment.update({
          where: { orderId },
          data: {
            carrier, // carrier da güncellenebilir
            tracking: tracking ?? existing.tracking,
            labelUrl: labelUrl ?? existing.labelUrl,
          },
          select: { id: true, orderId: true, carrier: true, tracking: true, labelUrl: true, createdAt: true, updatedAt: true },
        });
      } else {
        shipment = await tx.shipment.create({
          data: {
            orderId,
            carrier,
            tracking,
            labelUrl,
          },
          select: { id: true, orderId: true, carrier: true, tracking: true, labelUrl: true, createdAt: true, updatedAt: true },
        });
      }

      // durum geçişi: sadece PENDING/PAID -> SHIPPED
      if (order.status === "PENDING" || order.status === "PAID") {
        await tx.order.update({
          where: { id: orderId },
          data: { status: "SHIPPED" },
        });
      }

      return { shipment, statusBefore: order.status };
    });

    await logAdminAction({
      actorId: me.id,
      action: "shipment.upsert",
      target: orderId,
      meta: {
        orderCode: order.orderCode ?? null,
        carrier,
        tracking: tracking ?? null,
        labelUrl: labelUrl ?? null,
      },
    });

    return jsonOk({
      shipment: result.shipment,
      order: { id: orderId, statusBefore: result.statusBefore, statusAfter: ["PENDING", "PAID"].includes(order.status) ? "SHIPPED" : order.status },
    });
  } catch (e: any) {
    return jsonErr("ShipmentUpsertFailed", 500, { message: e?.message ?? "Unknown error" });
  }
}
