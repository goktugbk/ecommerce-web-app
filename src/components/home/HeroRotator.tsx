"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

type Button = {
  text: string;
  href: string;
  variant?: "primary" | "secondary" | "ghost";
};
type Slide = {
  id: string;
  title?: string;
  subtitle?: string;
  imageUrl: string;
  buttons?: Button[];
};

const btnClass = (v: Button["variant"] = "primary") =>
  v === "secondary"
    ? "rounded-md border px-4 py-2 text-sm bg-white text-gray-900 hover:bg-gray-50"
    : v === "ghost"
      ? "rounded-md px-4 py-2 text-sm text-white/90 ring-1 ring-white/40 hover:bg-white/10"
      : "rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-black/90";

export default function HeroRotator({ slides }: { slides: Slide[] }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const len = slides.length;
  const tRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-play (30s)
  useEffect(() => {
    if (len <= 1 || paused) return;
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setIdx((i) => (i + 1) % len), 30_000);
    return () => tRef.current && clearTimeout(tRef.current);
  }, [idx, len, paused]);

  const go = (n: number) => setIdx(((n % len) + len) % len);
  const next = () => go(idx + 1);
  const prev = () => go(idx - 1);

  // Klavye okları
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, len]);

  const cur = slides[idx];

  return (
    <section
      className="
        relative
        left-1/2
        w-screen -ml-[50vw] -mr-[50vw]   /* container'dan taşıp ekranı doldur */
        h-[80vh] md:h-[90vh]
        overflow-hidden
        rounded-none
        -mt-px                     /* üstte çıkabilecek 1px boşluğu yok et */
        bg-black                   /* ilk anda beyaz flush olmasın diye */
      "
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      {/* Slayt katmanları (opacity transition) */}
      {slides.map((s, i) => (
        <div
          key={s.id}
          className={`absolute inset-0 transition-opacity duration-700 ease-out ${
            i === idx ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={i !== idx}
        >
          <Image
            src={s.imageUrl}
            alt={s.title || "Hero"}
            fill
            priority={i === idx}
            className="object-cover"
          />
          {/* yumuşak karartma */}
          <div className="absolute inset-0 bg-black/25" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/35 to-transparent" />
        </div>
      ))}

      {/* İçerik (altta – sola yakın) */}
      <div className="relative z-10 mx-auto flex h-full max-w-7xl items-end px-6 pb-16 md:pb-24">
        <div className="max-w-3xl text-white">
          {cur?.subtitle && (
            <p className="mb-2 text-sm uppercase tracking-wide text-white/85">
              {cur.subtitle}
            </p>
          )}
          {cur?.title && (
            <h1 className="text-4xl font-semibold leading-tight drop-shadow md:text-5xl">
              {cur.title}
            </h1>
          )}
          {!!cur?.buttons?.length && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {cur.buttons!.map(
                (b, i) =>
                  b.text &&
                  b.href && (
                    <Link key={i} href={b.href} className={btnClass(b.variant)}>
                      {b.text}
                    </Link>
                  ),
              )}
            </div>
          )}
        </div>
      </div>

      {/* Kenar okları */}
      {len > 1 && (
        <>
          <Button
            aria-label="Önceki slayt"
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white backdrop-blur transition hover:bg-black/50"
            variant="default"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d="M15 18l-6-6 6-6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
          <Button
            aria-label="Sonraki slayt"
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white backdrop-blur transition hover:bg-black/50"
            variant="default"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d="M9 6l6 6-6 6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
        </>
      )}

      {/* Nokta göstergeleri */}
      {len > 1 && (
        <div className="pointer-events-auto absolute inset-x-0 bottom-6 z-10 flex items-center justify-center gap-2">
          {slides.map((_, i) => (
            <Button
              key={i}
              onClick={() => go(i)}
              className={`h-2.5 rounded-full transition-all ${
                i === idx ? "w-6 bg-white" : "w-2.5 bg-white/60 hover:bg-white"
              }`}
              aria-label={`Slayt ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
