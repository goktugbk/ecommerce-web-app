"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Img = { url: string; isPrimary?: boolean; isHover?: boolean };
type Product = {
  id: string;
  slug: string;
  title: string;
  price: number | string;
  currency: string;
  images: Img[];
};

export default function RelatedProductsCarousel({
  products,
}: {
  products: Product[];
}) {
  const pageSize = 4;

  const pages = useMemo(() => {
    const out: Product[][] = [];
    for (let i = 0; i < products.length; i += pageSize) {
      out.push(products.slice(i, i + pageSize));
    }
    return out;
  }, [products]);

  const [page, setPage] = useState(0);

  const prev = () => {
    if (pages.length === 0) return;
    setPage((p) => (p > 0 ? p - 1 : pages.length - 1)); // sona sar
  };

  const next = () => {
    if (pages.length === 0) return;
    setPage((p) => (p < pages.length - 1 ? p + 1 : 0)); // başa sar
  };

  if (products.length === 0) return null;

  // Üstte gösterilecek sayaç (ör. 4 / 13)
  const shown = Math.min(products.length, (page + 1) * pageSize);

  return (
    <section className="relative">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-lg font-semibold">Diğer Ürünler</h2>
        <p className="text-xs text-gray-500">
          {shown} / {products.length}
        </p>
      </div>

      <div className="relative group">
        {/* Sol ok */}
        <Button
          type="button"
          onClick={prev}
          aria-label="Önceki"
          className="absolute left-0 top-1/2 z-20 -translate-y-1/2 rounded-full border bg-white p-2 shadow
                     opacity-0 group-hover:opacity-100 transition"
          variant="outline"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        {/* Sağ ok */}
        <Button
          type="button"
          onClick={next}
          aria-label="Sonraki"
          className="absolute right-0 top-1/2 z-20 -translate-y-1/2 rounded-full border bg-white p-2 shadow
                     opacity-0 group-hover:opacity-100 transition"
          variant="outline"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>

        {/* 4’lü sayfa */}
        <div className="overflow-hidden rounded-2xl border bg-white p-4">
          <div
            key={page}
            className="grid grid-cols-2 gap-4 sm:grid-cols-4 transition"
          >
            {pages[page]?.map((prod) => {
              const primary =
                prod.images.find((i) => i.isPrimary)?.url ||
                prod.images[0]?.url ||
                "";

              const hoverUrl = prod.images.find((i) => i.isHover)?.url || null;

              const safe = (u: string) =>
                u?.startsWith("http://") ? u.replace("http://", "https://") : u;
              const priceNum =
                typeof prod.price === "number"
                  ? prod.price
                  : Number(prod.price || 0);

              return (
                <Link
                  key={prod.id}
                  href={`/products/${prod.slug}`}
                  className="group/card block rounded-2xl border p-3 shadow-sm transition hover:shadow-md"
                >
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-50">
                    {primary ? (
                      <Image
                        src={safe(primary)}
                        alt={prod.title}
                        fill
                        className="object-cover transition"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-gray-400">
                        Görsel yok
                      </div>
                    )}

                    {/* Hover yalnızca bu kartta */}
                    {hoverUrl && (
                      <Image
                        src={safe(hoverUrl)}
                        alt={`${prod.title} hover`}
                        fill
                        className="absolute inset-0 object-cover opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <h3 className="line-clamp-1 text-sm font-medium">
                      {prod.title}
                    </h3>
                    <span className="whitespace-nowrap text-xs font-semibold">
                      {priceNum.toFixed(2)} {prod.currency}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
