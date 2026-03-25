import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-server";

type Params = { params: { id: string } };

export async function DELETE(_req: Request, { params }: Params) {
  const me = await getSessionUser();
  if (!me) {
    return NextResponse.json({ ok: false, needLogin: true }, { status: 401 });
  }

  const id = params.id;
  if (!id) {
    return NextResponse.json(
      { ok: false, message: "Adres id gerekli." },
      { status: 400 },
    );
  }

  // Güvenlik: adres gerçekten bu kullanıcıya mı ait?
  const owns = await prisma.address.findFirst({
    where: { id, userId: me.id },
    select: { id: true },
  });
  if (!owns) {
    return NextResponse.json(
      { ok: false, message: "Adres bulunamadı veya yetkisiz." },
      { status: 404 },
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1) Eğer bu adres varsayılan ise önce kullanıcıdaki default'ı temizle/yenile
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

      // 2) Adresi sil
      await tx.address.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("Adres silme hatası:", e);
    return NextResponse.json({ ok: false, message: "Adres silinemedi." }, { status: 500 });
  }
}
