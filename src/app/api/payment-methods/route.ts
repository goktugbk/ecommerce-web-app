// src/app/api/payment-methods/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // DB'den oku
    const rows = await prisma.paymentMethod.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" },
    });

    let payments =
      rows.length > 0
        ? rows.map((r) => ({
            id: r.code || r.id, // ID olarak code’u tercih et
            name: r.name,
          }))
        : [];

    // Hiç kayıt yoksa akıllı varsayılanlar
    if (payments.length === 0) {
      payments = [
        { id: "pay-cc", name: "Kredi Kartı" },
        { id: "pay-cod", name: "Kapıda Ödeme (Nakit)" },
      ];
    }

    const res = NextResponse.json({ payments }, { status: 200 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e: any) {
    return NextResponse.json({ payments: [] }, { status: 200 });
  }
}
