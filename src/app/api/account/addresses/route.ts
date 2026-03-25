import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js";
import { getSessionUser } from "@/lib/auth-server"; // redirect ETMEYEN helper

// İstersen ad/soyad/telefonu al, ama Address tablosuna yazmayacağız.
const CreateSchema = z
  .object({
    firstName: z.string().min(1, "Ad gerekli"),
    lastName: z.string().min(1, "Soyad gerekli"),
    phone: z.string().min(5, "Telefon gerekli"), // E.164 (+905...)
    line1: z.string().min(1, "Adres satırı 1 gerekli"),
    line2: z.string().optional().default(""),
    city: z.string().min(2, "İl gerekli"),
    district: z.string().min(2, "İlçe gerekli"), // → state
    postal: z.string().optional().default(""),
    country: z.string().optional().default("TR"),
    isDefault: z.boolean().optional().default(false),
  })
  .refine(
    (v) => {
      const combined =
        `${(v.line1 ?? "").trim()} ${(v.line2 ?? "").trim()}`.trim();
      return combined.length >= 5;
    },
    {
      message: "Adres satırları toplam en az 5 karakter olmalı.",
      path: ["line1"],
    },
  );

export async function POST(req: Request) {
  try {
    const me = await getSessionUser();
    if (!me)
      return NextResponse.json({ ok: false, needLogin: true }, { status: 401 });

    const body = await req.json();
    const input = CreateSchema.parse(body);

    // Telefonu doğrula (adres tablosuna yazmıyoruz; ileride sipariş snapshot’ında kullanılabilir)
    if (!isValidPhoneNumber(input.phone)) {
      return NextResponse.json(
        { ok: false, message: "Telefon numarası geçersiz." },
        { status: 400 },
      );
    }

    // Varsayılan işaretlendiyse önce mevcut varsayılını temizle
    if (input.isDefault) {
      await prisma.address.updateMany({
        where: { userId: me.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    // 🔑 PRISMA MODELİNE UYGUN ALANLAR
    const created = await prisma.address.create({
      data: {
        userId: me.id,
        line1: input.line1,
        line2: input.line2 || null,
        city: input.city,
        state: input.district, // ← district → state
        postal: input.postal, // ← postal aynı isim
        country: input.country,
        isDefault: input.isDefault,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (err: any) {
    const message =
      err?.issues?.[0]?.message ||
      err?.message ||
      "Beklenmeyen bir hata oluştu.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
