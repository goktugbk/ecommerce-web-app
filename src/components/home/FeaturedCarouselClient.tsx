"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

type CardProduct = {
  id: string;
  slug: string;
  title: string;
  price: number;
  currency: string;
  image: string;
  hoverImage?: string | null;
};

export default function FeaturedCarouselClient({
  products = [] as CardProduct[],
}) {
  const visible = 3; // ekranda aynı anda 3 ürün görünsün
  const [index, setIndex] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const maxIndex = Math.max(0, products.length - visible);

  const prev = () => {
    setIndex((i) => (i - 1 < 0 ? maxIndex : i - 1));
  };

  const next = () => {
    setIndex((i) => (i + 1 > maxIndex ? 0 : i + 1));
  };

  if (products.length === 0) {
    return (
      <section className="mx-auto max-w-7xl px-6">
        <div className="rounded-2xl border bg-white p-6 text-center text-sm text-gray-500">
          Yeni ürün eklenmemiş.
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-xl font-semibold">Yeni Gelenler</h2>
      </div>

      <div className="relative group">
        {/* Oklar */}
        {products.length > visible && (
          <>
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
          </>
        )}

        {/* Kaydırma alanı */}
        <div className="overflow-hidden rounded-2xl border bg-white p-4">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${(index * 100) / visible}%)` }}
          >
            {products.map((p) => {
              const showHover = hoveredId === p.id && p.hoverImage;
              return (
                <Link
                  key={p.id}
                  href={`/products/${p.slug}`}
                  className="group/card w-1/3 flex-shrink-0 px-2 block rounded-2xl border p-3 shadow-sm transition hover:shadow-md"
                  onMouseEnter={() => setHoveredId(p.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-50">
                    <Image
                      src={p.image}
                      alt={p.title}
                      fill
                      className={`object-cover transition duration-300 ${showHover ? "opacity-0" : "opacity-100"}`}
                      sizes="33vw"
                    />
                    {p.hoverImage && (
                      <Image
                        src={p.hoverImage}
                        alt={`${p.title} hover`}
                        fill
                        className={`absolute inset-0 object-cover transition-opacity duration-300 ${showHover ? "opacity-100" : "opacity-0"}`}
                        sizes="33vw"
                      />
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <h3 className="line-clamp-1 text-sm font-medium">
                      {p.title}
                    </h3>
                    <span className="whitespace-nowrap text-xs font-semibold">
                      {p.price.toFixed(2)} {p.currency}
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
