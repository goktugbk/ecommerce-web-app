// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

  // Kategoriler
  const categories = await prisma.category.findMany({
    select: { slug: true, updatedAt: true },
    where: { homeFeatured: { in: [true, false] } },
  }).catch(() => [] as { slug: string, updatedAt: Date }[]);

  // Ürünler
  const products = await prisma.product.findMany({
    select: { slug: true, updatedAt: true, isActive: true },
    where: { isActive: true },
  }).catch(() => [] as { slug: string, updatedAt: Date, isActive: boolean }[]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/products`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/collections/all`, changeFrequency: "weekly", priority: 0.8 },
  ];

  const categoryPages: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${base}/collections/${c.slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
    lastModified: c.updatedAt,
  }));

  const productPages: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${base}/products/${p.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
    lastModified: p.updatedAt,
  }));

  return [...staticPages, ...categoryPages, ...productPages];
}
