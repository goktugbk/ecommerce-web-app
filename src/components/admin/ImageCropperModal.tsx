"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { Area, MediaSize, Point } from "react-easy-crop";
import { Button } from "@/components/ui/Button";

type Props = {
  src: string; // File input'tan gelen object URL veya normal URL
  aspect: number; // Örn: 21/9
  onClose: () => void;
  onCropped: (blob: Blob) => void;
};

async function getCroppedBlob(
  imageSrc: string,
  pixelCrop: Area,
  mime = "image/jpeg",
  quality = 0.92,
): Promise<Blob> {
  const img = document.createElement("img");
  img.crossOrigin = "anonymous";
  img.src = imageSrc;

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
  });

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(pixelCrop.width));
  canvas.height = Math.max(1, Math.round(pixelCrop.height));

  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    img,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b as Blob), mime, quality);
  });
}

export default function ImageCropperModal({
  src,
  aspect,
  onClose,
  onCropped,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(8);
  const [croppedPixels, setCroppedPixels] = useState<Area | null>(null);

  const onMediaLoaded = useCallback((m: MediaSize) => {
    const cw = containerRef.current?.clientWidth ?? 0;
    const ch = containerRef.current?.clientHeight ?? 0;

    if (!cw || !ch) {
      setMinZoom(1);
      setZoom(1);
      setMaxZoom(8);
      return;
    }

    const minZ = Math.max(cw / m.naturalWidth, ch / m.naturalHeight);
    setMinZoom(minZ);
    setZoom(minZ);
    setMaxZoom(Math.max(4, minZ * 4));
    setCrop({ x: 0, y: 0 });
  }, []);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedPixels(pixels);
  }, []);

  async function handleConfirm() {
    if (!croppedPixels) return;
    const blob = await getCroppedBlob(src, croppedPixels);
    onCropped(blob);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-base font-semibold tracking-tight">
            Görseli Kırp
          </h3>
          <Button
            onClick={onClose}
            className="rounded-md px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-100 active:scale-[0.98]"
            variant="secondary"
            size="sm"
          >
            Kapat
          </Button>
        </div>

        {/* Crop area */}
        <div
          ref={containerRef}
          className="relative h-[62vh] w-full bg-neutral-50"
        >
          <Cropper
            image={src}
            aspect={aspect}
            crop={crop}
            onCropChange={setCrop}
            zoom={zoom}
            onZoomChange={setZoom}
            minZoom={minZoom}
            maxZoom={maxZoom}
            restrictPosition
            showGrid={false}
            objectFit="contain"
            onMediaLoaded={onMediaLoaded}
            onCropComplete={onCropComplete}
            zoomWithScroll
            // görsel/vinyl alanına “zarif çerçeve” hissi
            classes={{
              containerClassName: "!bg-transparent",
              cropAreaClassName:
                "rounded-xl ring-1 ring-black/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]",
            }}
          />
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-4 border-t p-4 md:flex-row md:items-center md:justify-between">
          {/* Range modern stil */}
          <div className="flex w-full items-center gap-3 md:w-auto">
            <span className="text-sm text-gray-600">Yakınlaştır</span>
            <input
              type="range"
              min={minZoom}
              max={maxZoom}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full md:w-64 appearance-none bg-transparent"
              // track
              style={{
                background:
                  "linear-gradient(to right, #111 0%, #111 " +
                  ((zoom - minZoom) / (maxZoom - minZoom)) * 100 +
                  "%, #e5e7eb " +
                  ((zoom - minZoom) / (maxZoom - minZoom)) * 100 +
                  "%, #e5e7eb 100%)",
                height: 4,
                borderRadius: 9999,
              }}
            />
            <span className="text-xs tabular-nums text-gray-500">
              {zoom.toFixed(2)}x
            </span>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button
              onClick={onClose}
              className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm text-gray-800 shadow-sm transition hover:bg-gray-50 active:scale-[0.98]"
              variant="outline"
            >
              Vazgeç
            </Button>
            <Button
              onClick={handleConfirm}
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-black/90 active:scale-[0.98]"
              variant="default"
            >
              Onayla & Yükle
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
