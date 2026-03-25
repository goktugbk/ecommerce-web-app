// src/app/(site)/cart/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, Minus, Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/Button";

type CartItemUI = {
  id: string;
  productId: string;
  slug: string;
  title: string;
  price: number;        // birim fiyat
  currency: string;     // "TRY" vb.
  quantity: number;
  image?: string | null;
};

type CartResponse =
  | { ok: true; items: CartItemUI[] }
  | { ok: false; message?: string };

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItemUI[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [proceedLoading, setProceedLoading] = useState(false);

  const currency = items?.[0]?.currency || "TRY";
  const total = useMemo(
    () =>
      (items ?? []).reduce(
        (acc, it) => acc + Number(it.price || 0) * Number(it.quantity || 0),
        0
      ),
    [items]
  );

  // Cart'ı API'den yükle; API başarısızsa localStorage'a düş
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/cart", { cache: "no-store" });
        if (!res.ok) throw new Error("Sepet yüklenemedi");
        const data: CartResponse = await res.json();

        if (!cancelled) {
          if (data.ok) setItems(data.items || []);
          else {
            const raw = localStorage.getItem("cart");
            if (raw) {
              try {
                const parsed = JSON.parse(raw) as CartItemUI[];
                setItems(parsed);
              } catch { setItems([]); }
            } else setItems([]);
            if (data.message) setError(data.message);
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          const raw = localStorage.getItem("cart");
          if (raw) {
            try {
              const parsed = JSON.parse(raw) as CartItemUI[];
              setItems(parsed);
            } catch { setItems([]); }
          } else setItems([]);
          setError(e?.message || "Sepet yüklenirken hata oluştu");
        }
      } finally {
        !cancelled && setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  async function patchItemQuantity(id: string, nextQty: number) {
    if (!items) return;
    if (nextQty < 1) return removeItem(id);

    setBusyId(id);
    const prev = items;
    const next = prev.map((it) => (it.id === id ? { ...it, quantity: nextQty } : it));
    setItems(next);

    try {
      const res = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, quantity: nextQty }),
      });
      if (!res.ok) throw new Error("Güncellenemedi");
    } catch {
      setItems(prev);
    } finally {
      setBusyId(null);
    }
  }

  async function removeItem(id: string) {
    if (!items) return;
    setBusyId(id);
    const prev = items;
    const next = prev.filter((it) => it.id !== id);
    setItems(next);

    try {
      const res = await fetch("/api/cart", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Silinemedi");
    } catch {
      setItems(prev);
    } finally {
      setBusyId(null);
    }
  }

  // 🔑 Ödemeye geç: /api/checkout/start çağır, dönen URL'e git
  async function proceedToCheckout() {
    setProceedLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/start", {
        method: "POST",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok || !data?.url) {
        // /api/checkout/start back-end'i "Sepet boş" veya "cartId yok" diyorsa
        // burada kullanıcıya mesaj gösteriyoruz
        const msg = data?.error || "Checkout başlatılamadı";
        setError(msg);
        return;
      }

      router.push(data.url); // örn: /checkout?id=...&step=info
    } catch (e: any) {
      setError(e?.message || "Checkout başlatılırken hata oluştu");
    } finally {
      setProceedLoading(false);
    }
  }

  if (loading && items === null) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <h1 className="text-2xl font-semibold">Sepetim</h1>
        <p className="mt-4 text-gray-600">Yükleniyor…</p>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="mx-auto max-w-6xl p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Sepetim</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="rounded-2xl border bg-white/60 p-8 text-center">
          <ShoppingCart className="mx-auto mb-3" />
          <p className="text-gray-600">Sepetiniz boş.</p>
          <div className="mt-4">
            <Button asChild>
              <Link href="/products">Ürünlere göz at</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Sepetim</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Sol: Liste */}
        <div className="md:col-span-2 space-y-3">
          {items.map((it) => (
            <div
              key={it.id}
              className="flex items-center gap-4 rounded-2xl border bg-white/60 p-3 shadow-sm"
            >
              <div className="relative h-20 w-20 overflow-hidden rounded-md border bg-white">
                {it.image ? (
                  <Image src={it.image} alt={it.title} fill className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                    Görsel yok
                  </div>
                )}
              </div>

              <div className="flex-1">
                <Link href={`/products/${it.slug}`} className="line-clamp-1 font-medium hover:underline">
                  {it.title}
                </Link>
                <div className="mt-1 text-sm text-gray-600">
                  {new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(Number(it.price))}
                </div>

                {/* Qty controls */}
                <div className="mt-2 inline-flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => patchItemQuantity(it.id, it.quantity - 1)}
                    disabled={busyId === it.id}
                    aria-label="Adedi azalt"
                    title="Adedi azalt"
                  >
                    <Minus className="size-4" />
                  </Button>
                  <span className="min-w-8 text-center">{it.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => patchItemQuantity(it.id, it.quantity + 1)}
                    disabled={busyId === it.id}
                    aria-label="Adedi artır"
                    title="Adedi artır"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="text-sm font-medium">
                  {new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(Number(it.price) * Number(it.quantity))}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(it.id)}
                  disabled={busyId === it.id}
                  aria-label="Sepetten kaldır"
                  title="Sepetten kaldır"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Sağ: Özet */}
        <div className="rounded-2xl border bg-white/60 p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Sipariş Özeti</h2>
          <div className="flex items-center justify-between text-sm">
            <span>Ara toplam</span>
            <span>
              {new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(total)}
            </span>
          </div>

          <div className="mt-4">
            <Button className="w-full" onClick={proceedToCheckout} disabled={proceedLoading}>
              {proceedLoading ? "Yönlendiriliyor..." : "Ödemeye geç"}
            </Button>
          </div>

          <p className="mt-2 text-center text-xs text-gray-500">
            Ödeme sayfasında adres ve kargo seçeneklerini belirleyeceksiniz.
          </p>
        </div>
      </div>
    </div>
  );
}
