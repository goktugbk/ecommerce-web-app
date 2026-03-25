import { cookies } from "next/headers";
import { noStoreJson, prisma } from "@/lib/server";

export async function POST() {
  try {
    const cartId = cookies().get("cartId")?.value ?? null;
    if (!cartId) return noStoreJson({ ok: true }); // zaten yok

    await prisma.cartItem.deleteMany({ where: { cartId } });
    return noStoreJson({ ok: true });
  } catch (e: any) {
    return noStoreJson(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}
