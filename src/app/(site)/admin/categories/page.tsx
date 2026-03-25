"use client";

import { withCsrf, ensureCsrfReady } from "@/lib/security/csrf-client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import slugify from "slugify";
import AdminHeader from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/Button";

type Cat = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  homeFeatured: boolean;
  homeOrder: number | null;
};

export default function AdminCategoriesPage() {
  // Ensure CSRF cookie exists on mount
  useEffect(() => { ensureCsrfReady(); }, []);

  const [items, setItems] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // form
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [homeFeatured, setHomeFeatured] = useState(false);
  const [homeOrder, setHomeOrder] = useState<number | "">("");

  const fileRef = useRef<HTMLInputElement>(null);

  const toSlug = (s: string) => slugify(s, { lower: true, locale: "tr" });

  async function load() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/categories", withCsrf({ cache: "no-store" }));
      const data = await res.json();
      // Yeni API: { ok, categories }, Eski: { items }
      const list: Cat[] = data?.categories ?? data?.items ?? [];
      setItems(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setErr(e?.message ?? "Koleksiyonlar yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  // upload
  async function handleUpload(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/upload", withCsrf({ method: "POST", body: fd }));
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Yükleme hatası");
    setImageUrl(data.files?.[0]?.url ?? null);
  }

  // create
  async function createCat(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      const body = {
        name,
        slug: (slug || toSlug(name))?.trim(),
        imageUrl: imageUrl || undefined,
        homeFeatured,
        homeOrder: homeOrder === "" ? null : Number(homeOrder),
      };
      const res = await fetch("/api/admin/categories", withCsrf({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }));
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Kaydetme hatası");

      // reset
      setName("");
      setSlug("");
      setImageUrl(null);
      setHomeFeatured(false);
      setHomeOrder("");
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateField(id: string, patch: Partial<Cat>) {
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) alert(data?.error || "Güncelleme hatası");
    else load();
  }

  async function remove(id: string) {
    if (!confirm("Bu koleksiyonu silmek istiyor musun?")) return;
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) alert(data?.error || "Silme hatası");
    else load();
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <AdminHeader title="Koleksiyonlar" />

      {/* yeni koleksiyon */}
      <form
        onSubmit={createCat}
        className="space-y-4 rounded-2xl border bg-white p-4"
      >
        <h2 className="text-lg font-medium">Yeni Koleksiyon Ekle</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm">Ad</label>
            <input
              className="w-full rounded-md border p-2"
              value={name}
              onChange={(e) => {
                const v = e.target.value;
                setName(v);
                if (!slug) setSlug(toSlug(v));
              }}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Slug</label>
            <input
              className="w-full rounded-md border p-2"
              value={slug}
              onChange={(e) => setSlug(toSlug(e.target.value))}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm">Ana Sayfada Göster</label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={homeFeatured}
                onChange={(e) => setHomeFeatured(e.target.checked)}
              />
              <span className="text-sm text-gray-600">
                Keşfet bölümünde göster
              </span>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm">Sıra (Keşfet)</label>
            <input
              type="number"
              className="w-full rounded-md border p-2"
              value={homeOrder}
              onChange={(e) =>
                setHomeOrder(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm">Görsel</label>
            <div className="flex items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const input = e.currentTarget;
                  const f = input.files?.[0];
                  if (!f) return;
                  try {
                    await handleUpload(f);
                  } catch (err: any) {
                    alert(err?.message || "Yükleme hatası");
                  } finally {
                    input.value = "";
                  }
                }}
              />
              <Button
                type="button"
                className="rounded border px-3 py-2 text-sm"
                onClick={() => fileRef.current?.click()}
                variant="outline"
                size="sm"
              >
                Görsel Yükle
              </Button>
              {imageUrl && (
                <div className="relative h-16 w-28 overflow-hidden rounded-md border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <Button
          disabled={saving || !name}
          className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
          variant="default"
        >
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </form>

      {/* liste */}
      <div className="overflow-hidden rounded-2xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3">Görsel</th>
              <th className="px-4 py-3">Ad</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Featured</th>
              <th className="px-4 py-3">Sıra</th>
              <th className="px-4 py-3 text-right">İşlem</th>
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
                  Koleksiyon yok.
                </td>
              </tr>
            )}
            {items.map((c) => {
              const src = c.imageUrl
                ? c.imageUrl.startsWith("http://")
                  ? c.imageUrl.replace("http://", "https://")
                  : c.imageUrl
                : null;

              return (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-2">
                    <div className="relative h-14 w-24 overflow-hidden rounded-md bg-gray-50">
                      {src ? (
                        <Image src={src} alt="" fill className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                          Yok
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-2">
                    <input
                      className="w-full rounded border p-1"
                      defaultValue={c.name}
                      onBlur={(e) =>
                        updateField(c.id, {
                          name: e.target.value,
                          slug: toSlug(e.target.value),
                        })
                      }
                    />
                  </td>

                  <td className="px-4 py-2 text-gray-600">{c.slug}</td>

                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      defaultChecked={c.homeFeatured}
                      onChange={(e) =>
                        updateField(c.id, { homeFeatured: e.target.checked })
                      }
                    />
                  </td>

                  <td className="px-4 py-2">
                    <input
                      type="number"
                      defaultValue={c.homeOrder ?? 0}
                      className="w-20 rounded border p-1"
                      onBlur={(e) =>
                        updateField(c.id, {
                          homeOrder:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        })
                      }
                    />
                  </td>

                  <td className="px-4 py-2 text-right">
                    <Button
                      onClick={() => remove(c.id)}
                      className="rounded border px-2 py-1 text-xs"
                      variant="outline"
                      size="sm"
                    >
                      Sil
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
