// src/components/home/FeaturedCarousel.tsx
import { prisma } from "@/lib/prisma";
import FeaturedCarouselClient from "./FeaturedCarouselClient";

export default async function FeaturedCarousel() {
  const products = await prisma.product.findMany({
    where: { isActive: true, isFeatured: true },
    include: { images: true },
    orderBy: [{ featuredOrder: "asc" }, { createdAt: "desc" }],
    take: 24,
  });

  const mapped = products.map((p) => {
    const primary =
      p.images.find((i) => i.isPrimary)?.url || p.images[0]?.url || null;
    const hover = p.images.find((i) => i.isHover)?.url || null;
    const fix = (u: string | null) =>
      u
        ? u.startsWith("http://")
          ? u.replace("http://", "https://")
          : u
        : undefined;
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      price: Number(p.price),
      currency: p.currency,
      image: fix(primary) ?? "/placeholder.png",
      hoverImage: fix(hover),
    };
  });

  return <FeaturedCarouselClient products={mapped} />;
}
