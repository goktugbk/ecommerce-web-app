// src/components/home/CategoryTiles.tsx
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

function toHttps(url?: string | null) {
  if (!url) return undefined;
  return url.startsWith("http://") ? url.replace("http://", "https://") : url;
}

export default async function CategoryTiles() {
  const cats = await prisma.category.findMany({
    where: { homeFeatured: true },
    orderBy: [{ homeOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, imageUrl: true },
    take: 8,
  });

  if (cats.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1600px] px-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Keşfet</h2>
        <Link
          href="/collections/all"
          className="text-sm font-medium text-gray-800 hover:underline"
        >
          Tüm koleksiyon
        </Link>
      </div>

      <div className="flex flex-wrap justify-center gap-8">
        {cats.map((c) => (
          <Link
            key={c.id}
            href={`/collections/${c.slug}`}
            className="group block overflow-hidden rounded-2xl shadow-md transition hover:shadow-xl w-[450px]"
          >
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl">
              {c.imageUrl ? (
                <Image
                  src={toHttps(c.imageUrl)!}
                  alt={c.name}
                  fill
                  sizes="450px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg text-gray-400">
                  Görsel yok
                </div>
              )}
            </div>

            {/* Yazı alta alındı */}
            <div className="p-4 text-center">
              <span className="inline-block text-lg font-semibold text-gray-900">
                {c.name}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
