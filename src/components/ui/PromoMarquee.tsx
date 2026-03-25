"use client";

type Props = {
  items: string[];
  /** Büyük = daha yavaş (varsayılan 26s) */
  durationSec?: number;
  /** Öğeler arası boşluk (örn: "3rem", "48px") */
  gap?: string;
  /** Örn: "bg-black text-white" */
  className?: string;
  /** Yükseklik (örn: "44px") — ister CSS’ten kontrol et, ister buradan */
  height?: string;
};

export default function PromoMarquee({
  items,
  durationSec = 26,
  gap = "3rem",
  className = "",
  height, // opsiyonel
}: Props) {
  const content = items;

  const styleVars = {
    // @ts-ignore custom props
    "--marquee-gap": gap,
    "--marquee-duration": `${durationSec}s`,
    ...(height ? { /* @ts-ignore */ "--marquee-height": height } : {}),
  } as React.CSSProperties;

  return (
    <div className={`marquee ${className}`} style={styleVars}>
      {/* Şerit 1 */}
      <div
        className="marquee__track"
        style={{ animationDuration: `var(--marquee-duration)` }}
      >
        <Row items={content} />
      </div>

      {/* Şerit 2 — yarım periyot gecikmeyle başladığı için “tık” yok */}
      <div
        className="marquee__track"
        aria-hidden
        style={{
          animationDuration: `var(--marquee-duration)`,
          animationDelay: `calc(var(--marquee-duration) / -2)`,
        }}
      >
        <Row items={content} />
      </div>
    </div>
  );
}

function Row({ items }: { items: string[] }) {
  const doubled = [...items, ...items]; // kesintisiz akış için iki kat
  return (
    <div className="marquee__row">
      {doubled.map((text, i) => (
        <span key={i} className="marquee__item">
          {text}
        </span>
      ))}
    </div>
  );
}
