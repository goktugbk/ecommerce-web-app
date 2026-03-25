import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

type Props = {
  id: string;
  slug: string;
  title: string;
  // price bazen number değil gelebilir (Prisma.Decimal, string vs.)
  price: unknown;
  currency?: string;
  image?: string | null;
  hoverImage?: string | null;
};

function toAmount(x: unknown): number {
  // Prisma.Decimal için
  if (x && typeof x === "object" && "toNumber" in (x as any)) {
    try {
      return (x as any).toNumber();
    } catch {}
  }
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(amount: number, currency = "TRY", locale = "tr-TR") {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Geçersiz currency gelirse fallback
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function safeUrl(u?: string | null) {
  if (!u) return undefined;
  if (u.startsWith("http://")) return u.replace("http://", "https://");
  return u;
}

export default function ProductCard({
  id,
  slug,
  title,
  price,
  currency = "TRY",
  image,
  hoverImage,
}: Props) {
  const amount = toAmount(price);
  const primary = safeUrl(image);
  const hover = safeUrl(hoverImage);

  return (
    <Link
      href={`/products/${slug}`}
      className="group/card block rounded-2xl border p-4 shadow-sm transition hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-50">
        {primary ? (
          <>
            <Image
              src={primary}
              alt={title}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className={
                "object-cover transition-opacity duration-300" +
                (hover ? " group-hover/card:opacity-0" : "")
              }
            />
            {hover && (
              <Image
                src={hover}
                alt={`${title} hover`}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="absolute inset-0 object-cover opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
              />
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400 text-xs">
            Görsel yok
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <h3 className="line-clamp-1 font-medium">{title}</h3>
        <Badge className="whitespace-nowrap">
          {formatMoney(amount, currency)}
        </Badge>
      </div>
    </Link>
  );
}
