// pseudo-örnek
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const payload = await req.json();
  // 1) imza doğrula (sağlayıcıya göre)
  // 2) orderCode veya metadata.orderId çek
  const order = await prisma.order.findUnique({
    where: { orderCode: payload.orderCode },
  });
  if (!order) return NextResponse.json({ ok: false }, { status: 404 });

  // idempotent: zaten PAID ise yeniden yazma
  if (order.status === "PENDING" && payload.event === "payment_succeeded") {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "PAID" },
    });
    // e-posta/fiş: queue veya arkaplan job tetikle
  }
  return NextResponse.json({ ok: true });
}
