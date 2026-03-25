// src/app/(site)/account/actions/auth.ts
"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, clearSessionCookie } from "@/lib/auth-server";
import { isValidPhoneNumber } from "libphonenumber-js";
import { redirect } from "next/navigation";

/* ------------------ Schema ------------------ */
const registerSchema = z.object({
  email: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
    z.string().email("Geçerli bir e-posta girin"),
  ),
  firstName: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(2, "Ad en az 2 karakter"),
  ),
  lastName: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(2, "Soyad en az 2 karakter"),
  ),
  phone: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(8, "Telefon geçersiz"),
  ),
  password: z.string().min(6, "Şifre en az 6 karakter"),
});

/* ------------------ Helpers ------------------ */
function firstIssue(err: z.ZodError): string {
  return err.issues?.[0]?.message ?? "Geçersiz form verisi.";
}

/* ------------------ REGISTER ------------------ */
export async function registerAction(formData: FormData) {
  try {
    const data = {
      email: String(formData.get("email") ?? ""),
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      password: String(formData.get("password") ?? ""),
    };
    const returnTo = String(formData.get("returnTo") ?? "");

    const parsed = registerSchema.safeParse(data);
    if (!parsed.success) {
      return { ok: false as const, error: firstIssue(parsed.error) };
    }

    const { email, firstName, lastName, phone, password } = parsed.data;

    // Ülke belirtilerek doğrula (TR)
    if (!isValidPhoneNumber(phone, "TR")) {
      return { ok: false as const, error: "Telefon numarası geçersiz." };
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { ok: false as const, error: "Bu e-posta zaten kayıtlı." };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, firstName, lastName, phone },
      select: { id: true, email: true, role: true },
    });

    // Otomatik giriş (imza: userId)
    await setSessionCookie(user.id);

    // Başarıda kesin yönlendirme
    redirect(returnTo || "/account");
  } catch {
    return {
      ok: false as const,
      error: "Kayıt sırasında beklenmeyen bir hata oluştu.",
    };
  }
}

/* ------------------ LOGIN ------------------ */
export async function loginAction(formData: FormData) {
  try {
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(formData.get("password") ?? "");
    const returnTo = String(formData.get("returnTo") ?? "");

    if (!email || !password) {
      return { ok: false as const, error: "E-posta veya şifre eksik." };
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, passwordHash: true },
    });
    if (!user)
      return { ok: false as const, error: "E-posta veya şifre hatalı." };

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid)
      return { ok: false as const, error: "E-posta veya şifre hatalı." };

    await setSessionCookie(user.id);

    // Başarıda kesin yönlendirme
    redirect(returnTo || "/account");
  } catch {
    return {
      ok: false as const,
      error: "Giriş sırasında beklenmeyen bir hata oluştu.",
    };
  }
}

/* ------------------ LOGOUT ------------------ */
export async function logoutAction() {
  await clearSessionCookie();
  redirect("/account/login");
}

/* ------------------ useActionState Wrapper'ları ------------------ */
// React.useActionState, (prevState, formData) imzası bekler
export async function registerActionState(_prev: unknown, formData: FormData) {
  return registerAction(formData);
}

export async function loginActionState(_prev: unknown, formData: FormData) {
  return loginAction(formData);
}
