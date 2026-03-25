// src/app/products/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/lib/prisma";
import ProductsFilters from "@/components/product/ProductsFilters";
import ProductCard from "@/components/product-card";
import Pagination from "@/components/ui/Pagination";

type SearchParams = {
  q?: string;
  category?: string;
  sort?: string;
  page?: string;
  limit?: string; // destekli (UI'da gösterilmiyor)
};

function toAmount(x: unknown): number {
  if (x && typeof x === "object" && "toNumber" in (x as any)) {
    try {
      return (x as any).toNumber();
    } catch {}
  }
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const q = (searchParams.q ?? "").trim();
  const categorySlug = searchParams.category ?? "all";
  const sort = searchParams.sort ?? "new";

  // Varsayılan 24; ?limit=48 de destekli
  const page = Number(searchParams.page ?? "1");
  const limitParam = Number(searchParams.limit ?? "24");
  const pageSize = limitParam === 48 ? 48 : 24;

  // Filtre paneli için kategoriler
  const categories = await prisma.category.findMany({
    orderBy: [{ homeOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true },
  });

  // Sıralama
  const orderBy =
    sort === "price_asc"
      ? { price: "asc" as const }
      : sort === "price_desc"
        ? { price: "desc" as const }
        : sort === "name_asc"
          ? { title: "asc" as const }
          : { createdAt: "desc" as const };

  // Filtre
  const where = {
    AND: [
      { isActive: true },
      q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
      categorySlug !== "all" ? { category: { slug: categorySlug } } : {},
    ],
  };

  // Toplam & sayfa
  const total = await prisma.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  // Ürünler
  const products = await prisma.product.findMany({
    where,
    orderBy,
    select: {
      id: true,
      slug: true,
      title: true,
      price: true,
      currency: true,
      images: { select: { url: true } },
    },
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
  });

  const items = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    price: toAmount(p.price),
    currency: p.currency ?? "TRY",
    image: p.images?.[0]?.url ?? null,
    hoverImage: p.images?.[1]?.url ?? null,
  }));

  return (
    <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 mt-6">
      <ProductsFilters
        categories={categories}
        currentQ={q}
        currentCategorySlug={categorySlug}
        currentSort={sort}
      />

      {/* Ürün Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((p) => (
          <ProductCard
            key={p.id}
            id={p.id}
            slug={p.slug}
            title={p.title}
            price={p.price}
            currency={p.currency}
            image={p.image}
            hoverImage={p.hoverImage}
          />
        ))}

        {items.length === 0 && (
          <div className="col-span-full text-sm opacity-70">
            Kriterlere uygun ürün bulunamadı.
          </div>
        )}
      </div>

      {/* Pagination: iki kolonu kapla, hep altta görünsün */}
      <div className="md:col-span-2">
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          q={q}
          categorySlug={categorySlug}
          sort={sort}
          limit={pageSize}
          alwaysShow
        />
      </div>
    </div>
  );
}
