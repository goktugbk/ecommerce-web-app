// src/components/home/Hero.tsx
import { prisma } from "@/lib/prisma";
import HeroRotator from "./HeroRotator";

type Button = {
  text: string;
  href: string;
  variant?: "primary" | "secondary" | "ghost";
};

export default async function Hero() {
  // Yalnızca aktif slaytlar
  const slides = await prisma.heroSlide.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      subtitle: true,
      imageUrl: true,
      // Prisma'da Json? alanı
      buttons: true as unknown as Button[] | null,
    },
  });

  if (!slides || slides.length === 0) return null;

  const safe = slides.map((s) => {
    // http -> https düzelt
    const img = s.imageUrl?.startsWith("http://")
      ? s.imageUrl.replace("http://", "https://")
      : s.imageUrl;

    // buttons JSON’unu güvenli biçimde ayrıştır
    const raw = (s as unknown as { buttons?: unknown }).buttons;
    const buttons: Button[] = Array.isArray(raw)
      ? raw
          .filter(
            (b): b is Button =>
              !!b &&
              typeof (b as any).text === "string" &&
              typeof (b as any).href === "string",
          )
          .map((b) => ({
            text: b.text,
            href: b.href,
            variant:
              b.variant === "secondary" || b.variant === "ghost"
                ? b.variant
                : "primary",
          }))
      : [];

    return {
      id: s.id,
      title: s.title ?? "",
      subtitle: s.subtitle ?? "",
      imageUrl: img,
      buttons,
    };
  });

  return <HeroRotator slides={safe} />;
}
