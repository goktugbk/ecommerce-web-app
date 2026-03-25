"use client";

import { withCsrf, ensureCsrfReady } from "@/lib/security/csrf-client";

import { useEffect, useState } from "react";
import Image from "next/image";
import AdminHeader from "@/components/admin/AdminHeader";

type Row = {
  id: string;
  title: string;
  slug: string;
  image: string | null;
  price: number;
  currency: string;
  isActive: boolean;
  isFeatured: boolean;
  featuredOrder: number | null;
};

export default function AdminFeaturedPage() {
  // Ensure CSRF cookie exists on mount
  useEffect(() => { ensureCsrfReady(); }, []);

  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function safeJson(res: Response) {
    const text = await res.text().catch(() => "");
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/featured", withCsrf({ cache: "no-store" }));
      const data = await safeJson(res);
      if (!res.ok)
        throw new Error(
          (data && (data.error || data.message)) || `HTTP ${res.status}`,
        );
      setItems((data?.items as Row[]) ?? []);
    } catch (e: any) {
      console.error(e);
      setItems([]);
      alert(e?.message || "Liste yüklenemedi");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function update(
    id: string,
    patch: Partial<Pick<Row, "isFeatured" | "featuredOrder">>,
  ) {
    try {
      const res = await fetch(`/api/admin/featured/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const d = await safeJson(res);
      if (!res.ok)
        throw new Error((d && (d.error || d.message)) || "Güncelleme hatası");
      await load();
    } catch (e: any) {
      alert(e?.message || "Güncelleme hatası");
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <AdminHeader title="Yeni Gelenler (Öne Çıkan Ürünler)" />

      <div className="overflow-hidden rounded-2xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3">Görsel</th>
              <th className="px-4 py-3">Ürün</th>
              <th className="px-4 py-3">Fiyat</th>
              <th className="px-4 py-3">Aktif</th>
              <th className="px-4 py-3">Öne Çıkar</th>
              <th className="px-4 py-3">Sıra</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-gray-500">
                  Yükleniyor…
                </td>
              </tr>
            )}

            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-gray-500">
                  Ürün yok.
                </td>
              </tr>
            )}

            {items.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-2">
                  <div className="relative h-14 w-24 overflow-hidden rounded bg-gray-50">
                    {p.image ? (
                      <Image
                        src={
                          p.image.startsWith("http://")
                            ? p.image.replace("http://", "https://")
                            : p.image
                        }
                        alt=""
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-xs text-gray-400">
                        Görsel yok
                      </div>
                    )}
                  </div>
                </td>

                <td className="px-4 py-2">
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-gray-500">{p.slug}</div>
                </td>

                <td className="px-4 py-2">
                  {p.price.toFixed(2)} {p.currency}
                </td>

                <td className="px-4 py-2">
                  <span
                    className={`rounded px-2 py-1 text-xs ${
                      p.isActive
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {p.isActive ? "Aktif" : "Pasif"}
                  </span>
                </td>

                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={p.isFeatured}
                    onChange={(e) =>
                      update(p.id, { isFeatured: e.target.checked })
                    }
                  />
                </td>

                <td className="px-4 py-2">
                  <input
                    type="number"
                    className="w-24 rounded border p-1"
                    defaultValue={p.featuredOrder ?? ""}
                    placeholder="-"
                    onBlur={(e) =>
                      update(p.id, {
                        featuredOrder:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500">
        Not: Carousel sırası önce <strong>featuredOrder (artan)</strong>, sonra{" "}
        <strong>createdAt (yeni → eski)</strong> ile belirlenir.
      </p>
    </main>
  );
}
