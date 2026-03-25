import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

function toHttps(url?: string | null) {
  if (!url) return undefined;
  return url.startsWith("http://") ? url.replace("http://", "https://") : url;
}

export default async function CollectionsAllPage() {
  // Tüm kategoriler (görsel alanını da al)
  const categories = await prisma.category.findMany({
    orderBy: [{ homeOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, imageUrl: true },
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-semibold">Koleksiyonlar</h1>

      {categories.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-gray-600">
          Henüz koleksiyon yok.
        </div>
      ) : (
        // 2 tane ise ortalansın, fazla olunca da düzgün dizilsin
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => {
            const src = toHttps(c.imageUrl);
            return (
              <Link
                key={c.id}
                href={`/collections/${c.slug}`}
                className="group block overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md"
              >
                {/* Görsel alanı: relative + sabit oran veriyoruz */}
                <div className="relative aspect-[4/3] w-full bg-gray-50">
                  {src ? (
                    <Image
                      src={src}
                      alt={c.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      sizes="(max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                      Görsel yok
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="text-base font-medium">{c.name}</h3>
                  <p className="mt-1 text-xs text-gray-500">Keşfet</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
