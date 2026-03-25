import { prisma } from "@/lib/prisma";

/** Ürün listesi (anasayfa) */
export async function listProducts() {
  return prisma.product.findMany({
    where: { isActive: true },
    include: { images: true, category: true },
    orderBy: { createdAt: "desc" },
    take: 24,
  });
}

/** Tip: fonksiyonun dönüşünden çıkarım */
export type ProductWithImages = Awaited<
  ReturnType<typeof listProducts>
>[number];
