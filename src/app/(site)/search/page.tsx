// src/app/(site)/search/page.tsx
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic"; // SSR her seferinde çalışsın

type SearchPageProps = {
  searchParams?: { q?: string };
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams?.q?.trim() || "";

  let products = [];
  if (query) {
    products = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 24,
    });
  }

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Arama</h1>

      {/* Search Form */}
      <form action="/search" method="get" className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Ürün ara..."
          className="flex-1 rounded-md border px-3 py-2"
        />
        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-white">
          Ara
        </button>
      </form>

      {/* Results */}
      {query && (
        <p className="text-sm text-gray-600">
          “{query}” için {products.length} sonuç bulundu.
        </p>
      )}

      <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <Link
            key={p.id}
            href={`/products/${p.slug}`}
            className="group rounded-lg border bg-white/60 p-3 shadow-sm hover:shadow-md transition"
          >
            {p.images?.[0]?.url && (
              <div className="relative aspect-square w-full overflow-hidden rounded-md">
                <Image
                  src={p.images[0].url}
                  alt={p.images[0].alt || p.title}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                />
              </div>
            )}
            <h2 className="mt-2 text-sm font-medium">{p.title}</h2>
            <p className="text-sm text-gray-600">
              {new Intl.NumberFormat("tr-TR", {
                style: "currency",
                currency: p.currency,
              }).format(Number(p.price))}
            </p>
          </Link>
        ))}
      </div>

      {query && products.length === 0 && (
        <p className="text-gray-500">Sonuç bulunamadı.</p>
      )}
    </div>
  );
}
