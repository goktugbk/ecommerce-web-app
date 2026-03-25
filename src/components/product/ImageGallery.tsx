"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";

type Img = { url: string; alt?: string | null };

export default function ImageGallery({ images }: { images: Img[] }) {
  const safeImages = useMemo(
    () =>
      (images ?? []).map((i) => ({
        url: i.url.startsWith("http://res.cloudinary.com")
          ? i.url.replace("http://", "https://")
          : i.url,
        alt: i.alt ?? "",
      })),
    [images],
  );

  const [active, setActive] = useState(0);

  if (!safeImages.length) {
    return (
      <div className="aspect-square w-full rounded-2xl border bg-gray-50" />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-[96px_1fr]">
      {/* Thumbnails (solda dikey, mobilde üstte yatay) */}
      <div className="order-2 flex gap-3 md:order-1 md:flex-col">
        {safeImages.map((img, idx) => (
          <Button
            key={idx}
            type="button"
            onClick={() => setActive(idx)}
            className={`relative h-20 w-20 overflow-hidden rounded-lg border ${
              active === idx ? "ring-2 ring-black" : ""
            }`}
            aria-label={`Görsel ${idx + 1}`}
          >
            <Image
              src={img.url}
              alt={img.alt || `Görsel ${idx + 1}`}
              fill
              className="object-cover"
              sizes="80px"
            />
          </Button>
        ))}
      </div>

      {/* Ana görsel */}
      <div className="order-1 relative aspect-square overflow-hidden rounded-2xl border md:order-2">
        <Image
          key={safeImages[active].url}
          src={safeImages[active].url}
          alt={safeImages[active].alt || "Ürün görseli"}
          fill
          className="object-cover"
          priority
          sizes="(min-width: 768px) 600px, 100vw"
        />
      </div>
    </div>
  );
}
