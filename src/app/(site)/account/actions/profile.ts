"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-server";
import { isValidPhoneNumber, parsePhoneNumber } from "libphonenumber-js";
import { revalidatePath } from "next/cache";

// Ad/Soyad yine trim + min(2)
const nameSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : v),
  z.string().min(2, "En az 2 karakter"),
);

const profileSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  // Burada email'i şimdilik sadece string olarak alıyoruz (trim/lower).
  // Doğrulamayı fallback uyguladıktan SONRA yapacağız.
  email: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
    z.string(), // email zorunlu ama boş gelirse fallback kullanacağız
  ),
  phone: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(8, "Telefon geçersiz"),
  ),
});

function firstIssue(err: z.ZodError) {
  return err.issues?.[0]?.message ?? "Geçersiz form verisi.";
}

export async function updateProfileAction(prev: any, formData: FormData) {
  try {
    const me = await requireUser("/account");

    // Önce mevcut e-postayı alalım (fallback için)
    const current = await prisma.user.findUnique({
      where: { id: me.id },
      select: { email: true },
    });

    const raw = {
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      email: String(formData.get("email") ?? ""), // disabled ise hiç gelmeyebilir
      phone: String(formData.get("phone") ?? ""),
    };

    const parsed = profileSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

    let { firstName, lastName, email, phone } = parsed.data;

    // 🔁 EMAIL FALLBACK:
    // Eğer formdan email boş geldi/gelmedi (disabled input’lar submit olmaz),
    // mevcut email’i kullan.
    email = email || current?.email || "";
    // Fallback sonrası RFC düzeyi kontrol
    const emailOk = z
      .string()
      .email("Geçerli e-posta")
      .safeParse(email).success;
    if (!emailOk) return { ok: false, error: "Geçerli e-posta" };

    // 📞 TR telefon normalize + doğrula
    // Kullanıcı 05xxxxxxxxx, 5xxxxxxxxx, +90 5xx... gibi yazabilir.
    try {
      const p = parsePhoneNumber(phone, "TR");
      if (!p?.isValid()) throw new Error();
      // DB'ye E.164 (+905xxxxxxxxx) olarak yazmak istersen:
      phone = p.number;
    } catch {
      // parsePhoneNumber fail olursa isValidPhoneNumber ile yedek kontrol
      if (!isValidPhoneNumber(phone, "TR")) {
        return { ok: false, error: "Telefon numarası geçersiz." };
      }
    }

    // 📧 E-posta değiştiyse benzersiz kontrol
    if (current && current.email !== email) {
      const mailTaken = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (mailTaken && mailTaken.id !== me.id) {
        return { ok: false, error: "Bu e-posta zaten kullanılıyor." };
      }
    }

    await prisma.user.update({
      where: { id: me.id },
      data: { firstName, lastName, email, phone },
    });

    revalidatePath("/account");
    return { ok: true as const };
  } catch (e) {
    return {
      ok: false,
      error: "Profil güncellenemedi. Lütfen tekrar deneyin.",
    };
  }
}
