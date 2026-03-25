// src/app/(site)/account/(private)/addresses/actions.ts
"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-server";
import type { CountryCode } from "libphonenumber-js";
import { parsePhoneNumberFromString, isValidPhoneNumber } from "libphonenumber-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const addrSchema = z.object({
  id: z.string().optional(),
  fullName: z.string().min(2),
  phone: z.string().min(8),
  line1: z.string().min(5),
  line2: z.string().optional(),
  district: z.string().min(2),
  city: z.string().min(2),
  postalCode: z.string().min(3),
  country: z.string().default("TR"),
  isDefault: z.coerce.boolean().optional(),
});

// ✅ libphonenumber-js doğru kullanım (CountryCode)
const DEFAULT_COUNTRY: CountryCode = "TR";
function normalizePhoneE164(input: string) {
  const raw = (input || "").trim();
  const p = parsePhoneNumberFromString(raw, DEFAULT_COUNTRY);
  if (p && p.isValid()) return p.number; // +905xxxxxxxxx
  return isValidPhoneNumber(raw, DEFAULT_COUNTRY) ? raw : null;
}

/** CREATE / UPDATE
 *  ⚠️ Form action ile kullanıldığı için İMZA: (formData: FormData)
 */
export async function upsertAddressAction(formData: FormData) {
  const me = await requireUser("/account/addresses");

  const input = {
    id: String(formData.get("id") ?? "") || undefined,
    fullName: String(formData.get("fullName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    line1: String(formData.get("line1") ?? ""),
    line2: (formData.get("line2") ?? "") as string,
    district: String(formData.get("district") ?? ""),
    city: String(formData.get("city") ?? ""),
    postalCode: String(formData.get("postalCode") ?? ""),
    country: String(formData.get("country") ?? "TR"),
    isDefault:
      formData.get("isDefault") === "on" ||
      formData.get("isDefault") === "true",
  };

  const parsed = addrSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Geçersiz form verisi." };
  const data = parsed.data;

  const phoneE164 = normalizePhoneE164(data.phone);
  if (!phoneE164) return { ok: false, error: "Telefon numarası geçersiz." };

  let targetId: string;

  if (data.id) {
    // Güvenlik: adres gerçekten bu kullanıcıya mı ait?
    const owns = await prisma.address.findFirst({
      where: { id: data.id, userId: me.id },
      select: { id: true },
    });
    if (!owns) return { ok: false, error: "Adres bulunamadı." };

    const updated = await prisma.address.update({
      where: { id: data.id },
      data: {
        fullName: data.fullName,
        phone: phoneE164,
        line1: data.line1,
        line2: data.line2 || null,
        district: data.district,
        city: data.city,
        postalCode: data.postalCode,
        country: data.country || "TR",
      },
    });
    targetId = updated.id;

    if (data.isDefault) {
      await prisma.user.update({
        where: { id: me.id },
        data: { defaultAddressId: targetId },
      });
    }
  } else {
    const created = await prisma.address.create({
      data: {
        userId: me.id,
        fullName: data.fullName,
        phone: phoneE164,
        line1: data.line1,
        line2: data.line2 || null,
        district: data.district,
        city: data.city,
        postalCode: data.postalCode,
        country: data.country || "TR",
      },
    });
    targetId = created.id;

    if (data.isDefault) {
      await prisma.user.update({
        where: { id: me.id },
        data: { defaultAddressId: targetId },
      });
    }
  }

  revalidatePath("/account/addresses");
  redirect("/account/addresses");
}

/** DELETE
 *  ⚠️ Form action ile kullanıldığı için İMZA: (formData: FormData)
 */
export async function deleteAddressAction(formData: FormData) {
  const me = await requireUser("/account/addresses");
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Adres bulunamadı." };

  await prisma.$transaction(async (tx) => {
    // Varsayılan ise önce değiştir/temizle
    const user = await tx.user.findUnique({
      where: { id: me.id },
      select: { defaultAddressId: true },
    });

    if (user?.defaultAddressId === id) {
      const another = await tx.address.findFirst({
        where: { userId: me.id, NOT: { id } },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

      await tx.user.update({
        where: { id: me.id },
        data: { defaultAddressId: another ? another.id : null },
      });
    }

    // Sonra sil
    await tx.address.deleteMany({ where: { id, userId: me.id } });
  });

  revalidatePath("/account/addresses");
  redirect("/account/addresses");
}

/** SET DEFAULT
 *  ⚠️ Form action ile kullanıldığı için İMZA: (formData: FormData)
 */
export async function setDefaultAddressAction(formData: FormData) {
  const me = await requireUser("/account/addresses");
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Adres bulunamadı." };

  const owns = await prisma.address.findFirst({
    where: { id, userId: me.id },
    select: { id: true },
  });
  if (!owns) return { ok: false, error: "Adres bulunamadı." };

  await prisma.user.update({
    where: { id: me.id },
    data: { defaultAddressId: id },
  });

  revalidatePath("/account/addresses");
  redirect("/account/addresses");
}
