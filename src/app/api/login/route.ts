// src/app/api/login/route.ts
import { NextResponse } from "next/server";
import { signUserToken } from "@/lib/auth-server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { email, password } = body;

  // TODO: Kullanıcı doğrulaması (DB vs.)
  // const user = await prisma.user.findUnique({ where: { email } });
  // if (!user || !(await verify(password, user.passwordHash))) return 401;

  const user = { id: "u_1", email, role: "CUSTOMER", name: "Gök­tuğ Karataş" }; // demo

  const jwt = signUserToken(user); // throws if JWT_SECRET yok

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: "token",
    value: jwt,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production", // prod’da true
    path: "/", // TÜM sitede geçerli
    maxAge: 60 * 60 * 24 * 7, // 7 gün
  });
  return res;
}
