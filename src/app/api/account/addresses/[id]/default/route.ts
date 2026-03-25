import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-server"; // redirect ETMEZ

type Params = { params: { id: string } };

export async function PATCH(_req: Request, { params }: Params) {
  const me = await getSessionUser();
  if (!me) {
    return NextResponse.json({ ok: false, needLogin: true }, { status: 401 });
  }

  const id = params.id;
  if (!id) {
    return NextResponse.json(
      { ok: false, message: "Adres bulunamadı." },
      { status: 400 },
    );
  }

  // Güvenlik: adres size mi ait?
  const addr = await prisma.address.findFirst({
    where: { id, userId: me.id },
    select: { id: true },
  });
  if (!addr) {
    return NextResponse.json(
      { ok: false, message: "Yetkisiz işlem." },
      { status: 403 },
    );
  }

  // 🔹 Tek varsayılan adres: User tarafında tutulur
  await prisma.user.update({
    where: { id: me.id },
    data: { defaultAddressId: id },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
