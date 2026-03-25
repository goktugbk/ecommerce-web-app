"use client";

import ImageGallery from "react-image-gallery";
import "react-image-gallery/styles/css/image-gallery.css";

type Item = {
  original: string;
  thumbnail: string;
  originalAlt?: string;
  thumbnailAlt?: string;
};

export default function ClientImageGallery({ items }: { items: Item[] }) {
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
