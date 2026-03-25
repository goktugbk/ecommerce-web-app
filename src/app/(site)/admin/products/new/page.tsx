// src/app/(site)/admin/products/new/page.tsx
"use client";

import { withCsrf, ensureCsrfReady } from "@/lib/security/csrf-client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type Uploaded = {
  url: string;
  publicId: string;
  isPrimary?: boolean; // Kapak
  isHover?: boolean;   // Hover
};

export default function NewProductPage() {
  // CSRF çerezi garanti olsun
  useEffect(() => {
    ensureCsrfReady();
  }, []);

  const r = useRouter();

  // Form alanları
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [price, setPrice] = useState<string>("");
  const [currency, setCurrency] = useState("TRY");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState<string>("0");

  // Görseller
  const [images, setImages] = useState<Uploaded[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // === Dosya yükleme ===
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const files = input.files;
    if (!files || files.length === 0) return;

    setErr(null);
    setUploading(true);

    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("file", f));

      const res = await fetch("/api/admin/upload", withCsrf({
        method: "POST",
        body: fd,
      }));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data && (data.error || data.message)) || "Yükleme başarısız"
        );
      }

      setImages((prev) => [...prev, ...(data.files as Uploaded[])]);
    } catch (err: any) {
      setErr(err?.message || "Yükleme hatası");
    } finally {
      setUploading(false);
      if (input) input.value = "";
    }
  }

  // --- Tekil seçim yardımcıları ---
  function setExclusive(
    items: Uploaded[],
    index: number,
    key: "isPrimary" | "isHover"
  ) {
    return items.map((img, i) =>
      i === index
        ? { ...img, [key]: true }
        : { ...img, [key]: false }
    );
  }

  function toggleExclusive(
    items: Uploaded[],
    index: number,
    key: "isPrimary" | "isHover"
  ) {
    const willSelect = !items[index]?.[key];
    if (!willSelect) {
      // Aynı butona tekrar basıldı → kapat
      return items.map((img, i) =>
        i === index ? { ...img, [key]: false } : img
      );
    }
    // Seç → aynı türde diğerlerini kapat
    return setExclusive(items, index, key);
  }

  // Kapak/Hover butonları
  function chooseCover(idx: number) {
    setImages((prev) => toggleExclusive(prev, idx, "isPrimary"));
  }
  function chooseHover(idx: number) {
    setImages((prev) => toggleExclusive(prev, idx, "isHover"));
  }

  // Görsel sil
  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  // === Ürün kaydet ===
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      const body = {
        title,
        slug,
        price: Number(price),
        currency,
        description,
        images: images.map((i) => ({
          url: i.url,
          isPrimary: !!i.isPrimary,
          isHover: !!i.isHover,
        })),
        inventory: { quantity: Math.max(0, Number(quantity) || 0) },
      };

      const res = await fetch("/api/admin/products", withCsrf({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data && (data.error || data.message)) || "Kaydetme hatası"
        );
      }

      r.push("/admin/products");
    } catch (e: any) {
      setErr(e?.message || "Kaydetme hatası");
    } finally {
      setSaving(false);
    }
  }

  // --- Chip stilleri ---
  const chipBase =
    "inline-flex items-center rounded border text-xs font-medium transition-all";
  const chipOff = "opacity-40 border-gray-300 text-gray-700 hover:opacity-70";
  const chipOn  = "bg-black text-white border-black opacity-100";

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/products" className="text-sm underline">
          ← Ürünlere dön
        </Link>
        <h1 className="text-2xl font-semibold">Yeni Ürün</h1>
      </div>

      <form
        onSubmit={handleSave}
        className="space-y-5 rounded-2xl border bg-white p-5"
      >
        {/* Temel alanlar */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm">Başlık</label>
            <input
              className="w-full rounded-md border p-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: Siyah Deri Omuz Çantası"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Slug</label>
            <input
              className="w-full rounded-md border p-2"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="siyah-deri-omuz-cantasi"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Fiyat</label>
            <input
              className="w-full rounded-md border p-2"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="1299.90"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Para Birimi</label>
            <input
              className="w-full rounded-md border p-2"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="TRY"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Adet (Stok)</label>
            <input
              className="w-full rounded-md border p-2"
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm">Açıklama</label>
          <textarea
            className="w-full rounded-md border p-2"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ürün detayları..."
          />
        </div>

        {/* Görsel yükleme + önizleme */}
        <div className="space-y-2">
          <label className="mb-1 block text-sm">Görseller</label>
          <input
            type="file"
            name="file"
            multiple
            accept="image/*"
            onChange={handleUpload}
          />
          {uploading && <p className="text-sm text-gray-500">Yükleniyor…</p>}

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-3 md:grid-cols-4">
              {images.map((img, i) => {
                const coverActive = !!img.isPrimary;
                const hoverActive = !!img.isHover;

                return (
                  <div
                    key={img.publicId ?? i}
                    className="relative overflow-hidden rounded-lg border"
                  >
                    {/* Görsel kısmı biraz daha büyük */}
                    <div className="relative aspect-[4/5]"> 
                      <Image
                        src={img.url}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 p-2 text-xs">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => chooseCover(i)}
                          className={`${chipBase} ${coverActive ? chipOn : chipOff} h-7 px-2`}
                          title="Kapak görseli"
                        >
                          Kapak
                        </button>

                        <button
                          type="button"
                          onClick={() => chooseHover(i)}
                          className={`${chipBase} ${hoverActive ? chipOn : chipOff} h-7 px-2`}
                          title="Hover görseli"
                        >
                          Hover
                        </button>
                      </div>

                      <Button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="ml-auto h-7 px-2 text-[11px]"
                        title="Önizlemeden kaldır"
                        variant="destructive"
                        size="sm"
                      >
                        Sil
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {err && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="flex justify-center">
          <Button
            type="submit"
            disabled={saving}
            className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            variant="default"
          >
            {saving ? "Kaydediliyor…" : "Ürünü Kaydet"}
          </Button>
        </div>
      </form>
    </main>
  );
}
