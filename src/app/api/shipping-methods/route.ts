// src/app/api/shipping-methods/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rows = await prisma.shippingMethod.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, fee: true },
      orderBy: { fee: "asc" },
    });

    let shippings =
      rows.length > 0
        ? rows.map((r) => ({
            id: r.code || r.id,
            name: r.name,
            fee: Number(r.fee),
          }))
        : [];

    // Kayıt yoksa varsayılanlar
    if (shippings.length === 0) {
      shippings = [
        { id: "ship-std", name: "Standart Kargo (2-4 gün)", fee: 0 },
        { id: "ship-exp", name: "Hızlı Kargo (1-2 gün)", fee: 49.9 },
      ];
    }

    const res = NextResponse.json({ shippings }, { status: 200 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch {
    return NextResponse.json({ shippings: [] }, { status: 200 });
  }
}
