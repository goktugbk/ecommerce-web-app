// src/app/collections/[handle]/page.tsx
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/product-card";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache"; // 👈 EKLE

function toHttps(url?: string | null) {
  if (!url) return undefined;
  return url.startsWith("http://") ? url.replace("http://", "https://") : url;
}

export default async function CollectionPage(props: {
  params: Promise<{ handle: string }>;
}) {
  noStore(); // 👈 SAYFAYI HER İSTEĞİNDE DB’DEN ÇEK

  const { handle } = await props.params;

  const category = await prisma.category.findUnique({
    where: { slug: handle },
  });

  if (!category) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-12">
        <h1 className="mb-2 text-2xl font-semibold">Koleksiyon bulunamadı</h1>
        <p className="text-gray-600">
          Aradığınız koleksiyon mevcut değil.{" "}
          <Link href="/collections/all" className="underline">
            Koleksiyonlara göz atın
          </Link>
          .
        </p>
      </main>
    );
  }

  const products = await prisma.product.findMany({
    where: { isActive: true, categoryId: category.id },
    include: { images: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-6 flex items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">{category.name}</h1>
        <span className="text-sm text-gray-500">{products.length} ürün</span>
      </div>

      {products.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-gray-600">
          Bu koleksiyonda ürün yok.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => {
            const primaryRaw =
              p.images?.find((i: any) => i.isPrimary)?.url ||
              p.images?.[0]?.url ||
              null;
            const hoverRaw = p.images?.find((i: any) => i.isHover)?.url || null;

            const primary = toHttps(primaryRaw);
            const hover = toHttps(hoverRaw || undefined);

            return (
              <ProductCard
                key={p.id}
                id={p.id}
                slug={p.slug}
                title={p.title}
                price={Number(p.price)}
                currency={p.currency}
                image={primary}
                hoverImage={hover}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
