// src/components/product/RelatedProducts.tsx
import RelatedProductsCarousel from "./RelatedProductsCarousel";
import { prisma } from "@/lib/prisma";

export default async function RelatedProducts({
  currentId,
}: {
  currentId: string;
}) {
  // İsteğe göre aynı kategoriden çekmek istiyorsan categoryId filtresi ekleyebilirsin.
  const items = await prisma.product.findMany({
    where: { isActive: true, NOT: { id: currentId } },
    include: { images: true },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  const mapped = items.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    price: Number(p.price),
    currency: p.currency,
    image:
      p.images.find((i: any) => i.isPrimary)?.url || p.images[0]?.url || null,
  }));

  if (mapped.length === 0) return null;

  return <RelatedProductsCarousel items={mapped} />;
}
