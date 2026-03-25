// src/app/(site)/admin/products/page.tsx
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-server"; // ✅ doğru import
import { redirect } from "next/navigation";
import DeleteProductButton from "@/components/admin/DeleteProductButton";
import CategorySelect from "@/components/admin/CategorySelect";
import AdminHeader from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/Button";

function toHttps(url?: string | null) {
  if (!url) return undefined;
  return url.startsWith("http://") ? url.replace("http://", "https://") : url;
}
function fmtPrice(val: unknown) {
  const n = typeof val === "number" ? val : Number(val);
  if (Number.isNaN(n)) return "—";
  return n.toFixed(2);
}

export default async function AdminProductsPage() {
  const me = await getSessionUser();
  if (!me || me.role !== "ADMIN") redirect("/account");

  const [items, categories] = await Promise.all([
    prisma.product.findMany({
      include: {
        images: true,
        inventory: true,
        category: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.category.findMany({
      orderBy: [{ homeOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  return (
    <main className="space-y-6">
      {/* Başlık + geri butonu */}
      <AdminHeader title="Ürünler" />

      {/* Sağ üstte “Yeni Ürün” */}
      <div className="flex justify-end">
        <Link
          href="/admin/products/new"
          className="rounded-md bg-black px-3 py-2 text-sm text-white"
        >
          Yeni Ürün
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3">Görsel</th>
              <th className="px-4 py-3">Başlık</th>
              <th className="px-4 py-3">Fiyat</th>
              <th className="px-4 py-3">Stok</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => {
              const primaryUrl =
                p.images.find((i: any) => i.isPrimary)?.url || p.images[0]?.url;
              const safePrimary = toHttps(primaryUrl);

              return (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-2">
                    {safePrimary ? (
                      <div className="relative h-14 w-14 overflow-hidden rounded-md bg-gray-50">
                        <Image
                          src={safePrimary}
                          alt=""
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-14 w-14 rounded-md border bg-gray-50" />
                    )}
                  </td>

                  <td className="px-4 py-2">
                    <div className="font-medium">{p.title}</div>
                    <div className="text-[11px] text-gray-500">{p.slug}</div>
                  </td>

                  <td className="px-4 py-2">
                    {fmtPrice(p.price)} {p.currency}
                  </td>

                  <td className="px-4 py-2">{p.inventory?.quantity ?? 0}</td>

                  {/* ✅ Kategori seçici */}
                  <td className="px-4 py-2">
                    <CategorySelect
                      productId={p.id}
                      value={p.category?.id ?? ""}
                      categories={categories}
                    />
                  </td>

                  <td className="px-4 py-2">
                    {p.isActive ? "Aktif" : "Pasif"}
                  </td>

                  <td className="px-4 py-2 text-right">
                    <form
                      action={`/api/admin/products/${p.id}`}
                      method="post"
                      className="inline"
                    >
                      <input type="hidden" name="_method" value="PATCH" />
                      <input type="hidden" name="op" value="toggle-active" />
                      <Button
                        className="rounded border px-2 py-1 text-xs"
                        variant="outline"
                        size="sm"
                      >
                        Aktif/Pasif
                      </Button>
                    </form>

                    <form
                      action={`/api/admin/products/${p.id}`}
                      method="post"
                      className="ml-2 inline"
                    >
                      <input type="hidden" name="_method" value="PATCH" />
                      <input type="hidden" name="op" value="inc-stock" />
                      <Button
                        className="rounded border px-2 py-1 text-xs"
                        variant="outline"
                        size="sm"
                      >
                        Stok +1
                      </Button>
                    </form>

                    <form
                      action={`/api/admin/products/${p.id}`}
                      method="post"
                      className="ml-2 inline"
                    >
                      <input type="hidden" name="_method" value="PATCH" />
                      <input type="hidden" name="op" value="dec-stock" />
                      <Button
                        className="rounded border px-2 py-1 text-xs"
                        variant="outline"
                        size="sm"
                      >
                        Stok -1
                      </Button>
                    </form>

                    <span className="ml-2 inline-block">
                      <DeleteProductButton id={p.id} />
                    </span>
                  </td>
                </tr>
              );
            })}

            {items.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={7}>
                  Ürün yok. Sağ üstten “Yeni Ürün” ekleyebilirsin.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
