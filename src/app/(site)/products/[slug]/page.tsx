// src/app/products/[slug]/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ReviewBlock from "@/components/reviews/ReviewBlock";
import ProductInfoRow from "@/components/product/ProductInfoRow";
import ImageGallery from "@/components/product/ImageGallery";
import QuantityBar from "@/components/product/QuantityBar";
import ExpandableDescription from "@/components/product/ExpandableDescription";
import RelatedProductsCarousel from "@/components/product/RelatedProductsCarousel";

function Stars({ value }: { value: number }) {
  const v = Math.max(0, Math.min(5, value));
  return (
    <div className="inline-flex items-center gap-1 text-yellow-500">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className={`h-4 w-4 ${i < Math.round(v) ? "fill-yellow-500" : "fill-none"} stroke-yellow-500`}
        >
          <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
        </svg>
      ))}
    </div>
  );
}

export default async function ProductDetail(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;

  const p = await prisma.product.findUnique({
    where: { slug },
    include: { images: true, inventory: true },
  });

  if (!p) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <p>Ürün bulunamadı.</p>
        <Link href="/products" className="underline">
          Tüm ürünler
        </Link>
      </main>
    );
  }

  // Görseller: Kapak → Hover → Diğerleri (ve http→https düzelt)
  const imgs = (p.images ?? []).map((im) => ({
    ...im,
    url: im.url.startsWith("http://")
      ? im.url.replace("http://", "https://")
      : im.url,
  }));
  const ordered = [
    ...imgs.filter((i) => i.isPrimary),
    ...imgs.filter((i) => i.isHover && !i.isPrimary),
    ...imgs.filter((i) => !i.isPrimary && !i.isHover),
  ].filter((v, i, a) => a.findIndex((x) => x.id === v.id) === i);

  // Puan ortalaması + yorum sayısı
  const agg = await prisma.review.aggregate({
    where: { productId: p.id },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const avg = Number(agg._avg.rating ?? 0);
  const count = agg._count._all;

  // İlgili ürünler (bu ürünü çıkar, aktif olanlardan 12 adet)
  const related = await prisma.product.findMany({
    where: { id: { not: p.id }, isActive: true },
    include: { images: true },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  const relatedForCarousel = related.map((rp) => ({
    id: rp.id,
    slug: rp.slug,
    title: rp.title,
    price: Number(rp.price),
    currency: rp.currency,
    images: (rp.images ?? []).map((im) => ({
      url: im.url.startsWith("http://")
        ? im.url.replace("http://", "https://")
        : im.url,
      isPrimary: im.isPrimary,
      isHover: im.isHover,
    })),
  }));

  const stock = p.inventory?.quantity ?? 0;
  const outOfStock = stock <= 0;

  return (
    <main className="mx-auto max-w-7xl p-6">
      {/* Üst kısım: geniş galeri + bilgiler */}
      <section className="grid gap-10 md:grid-cols-[1.2fr_1fr]">
        {/* Galeri */}
        <div className="min-h-0">
          <ImageGallery
            images={ordered.map((i) => ({ url: i.url, alt: i.alt ?? p.title }))}
          />
        </div>

        {/* Bilgiler */}
        <div className="space-y-5">
          <h1 className="text-3xl font-semibold">{p.title}</h1>

          {/* Puan + değerlendirme sayısı */}
          <div className="flex items-center gap-3">
            <Stars value={avg} />
            <span className="text-sm text-gray-600">
              {count > 0
                ? `${avg.toFixed(1)} / 5 · ${count} değerlendirme`
                : "Henüz değerlendirme yok"}
            </span>
          </div>

          {/* Fiyat */}
          <p className="text-2xl font-medium">
            {Number(p.price).toFixed(2)} {p.currency}
          </p>

          {/* Stok / Tükendi */}
          {outOfStock ? (
            <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
              Tükendi
            </span>
          ) : (
            <p className="text-sm text-gray-500">Stok: {stock}</p>
          )}

          {/* Adet seç + Sepete Ekle barı (stok yoksa kilitli) */}
          <QuantityBar
            productId={p.id}
            max={outOfStock ? 0 : stock}
            currency={p.currency}
            price={Number(p.price)}
            disabled={outOfStock}
          />

          {/* Açıklama (açılır/kapanır, varsayılan açık, gri arkaplan) */}
          {p.description && (
            <div className="mt-6">
              <ExpandableDescription text={p.description} />
            </div>
          )}
        </div>
      </section>

      {/* İkonlu bilgi satırı (SSS / İade-Değişim vs.) */}
      <div className="mt-12">
        <ProductInfoRow />
      </div>

      {/* Diğer ürünler: Carousel */}
      {relatedForCarousel.length > 0 && (
        <div className="mt-12">
          <RelatedProductsCarousel products={relatedForCarousel} />
        </div>
      )}

      {/* Yorumlar */}
      <section id="yorumlar" className="mt-16">
        <ReviewBlock productId={p.id} />
      </section>
    </main>
  );
}
