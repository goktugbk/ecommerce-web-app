"use client";

import ImageGallery from "react-image-gallery";
import "react-image-gallery/styles/css/image-gallery.css";

type Img = { url: string; alt?: string | null };

export default function ProductGallery({ images }: { images: Img[] }) {
  // react-image-gallery item formatına çevir
  const items =
    images.length > 0
      ? images.map((im) => ({
          original: im.url,
          thumbnail: im.url,
          originalAlt: im.alt ?? "",
          thumbnailAlt: im.alt ?? "",
        }))
      : [
          {
            original: "/placeholder.png",
            thumbnail: "/placeholder.png",
            originalAlt: "Görsel yok",
            thumbnailAlt: "Görsel yok",
          },
        ];

  return (
    <ImageGallery
      items={items}
      showFullscreenButton={false}
      showPlayButton={false}
      showIndex={false}
      slideDuration={350}
      thumbnailPosition="left" // istersen "bottom"
      additionalClass="rounded-2xl overflow-hidden bg-white"
    />
  );
}
