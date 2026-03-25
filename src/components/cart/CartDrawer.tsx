// src/components/cart/CartDrawer.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, Trash2 } from "lucide-react";
import { useCartDrawer } from "@/lib/cart-drawer-store";
import { Button } from "@/components/ui/Button";

type CartItemUI = {
  id: string;
  productId: string;
  slug: string;
  title: string;
  price: number;
  currency: string;
  quantity: number;
  image?: string | null;
};

export default function CartDrawer() {
  const router = useRouter();

  // drawer state
  const open = useCartDrawer((s) => s.open);
  const closeDrawer = useCartDrawer((s) => s.closeDrawer);

  const [items, setItems] = useState<CartItemUI[]>([]);
  const [total, setTotal] = useState(0);
  const [currency, setCurrency] = useState("TRY");
  const [loading, setLoading] = useState(false);
  const [proceedLoading, setProceedLoading] = useState(false);

  async function refreshCart() {
    const data = await fetch("/api/cart", {
      cache: "no-store",
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then((r) => r.json())
      .catch(() => ({}) as any);

    const arr = Array.isArray(data.items) ? (data.items as CartItemUI[]) : [];
    setItems(arr);

    // total backend vermezse hesapla
    const t =
      typeof data.total === "number"
        ? data.total
        : arr.reduce(
            (s, it) => s + (Number(it.price) || 0) * (it.quantity || 0),
            0,
          );

    setTotal(t);
    setCurrency(
      typeof data.currency === "string"
        ? data.currency
        : arr[0]?.currency || "TRY",
    );
  }

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    refreshCart().finally(() => setLoading(false));
  }, [open]);

  const isEmpty = useMemo(
    () => items.length === 0 || total <= 0,
    [items, total],
  );

  async function inc(itemId: string) {
    const current = items.find((i) => i.id === itemId)?.quantity ?? 0;
    const next = Math.min(99, current + 1);
    const res = await fetch("/api/cart", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, quantity: next }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d?.error || "Miktar artırılamadı.");
      return;
    }
    await refreshCart();
  }

  async function dec(itemId: string) {
    const current = items.find((i) => i.id === itemId)?.quantity ?? 0;
    const next = Math.max(0, current - 1); // 0 olursa item backend’de silinebilir
    const res = await fetch("/api/cart", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, quantity: next }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d?.error || "Miktar azaltılamadı.");
      return;
    }
    await refreshCart();
  }

  async function removeItem(itemId: string) {
    const res = await fetch("/api/cart", {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d?.error || "Ürün kaldırılamadı.");
      return;
    }
    await refreshCart();
  }

  async function proceedToCheckout() {
    if (proceedLoading || isEmpty) return;
    setProceedLoading(true);
    try {
      const res = await fetch("/api/checkout/start", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok)
        throw new Error(data?.error || "Oturum açılamadı");
      closeDrawer();
      router.push(data.url); // /checkout?id=...&step=info
    } catch (e: any) {
      alert(e?.message || "Bir hata oluştu");
    } finally {
      setProceedLoading(false);
    }
  }

  return (
    <>
      {/* backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={closeDrawer}
        aria-hidden
      />

      {/* drawer */}
      <aside
        className={`fixed right-0 top-0 z-[61] h-screen w-full max-w-md transform bg-white shadow-xl transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-labelledby="cart-drawer-title"
      >
        <div className="flex items-center justify-between border-b p-4">
          <h3 id="cart-drawer-title" className="text-lg font-semibold">
            Sepetim
          </h3>
          <Button
            onClick={closeDrawer}
            className="rounded p-2 hover:bg-gray-100"
            aria-label="Kapat"
            variant="secondary"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex h-[calc(100vh-64px)] flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            {loading && <p className="text-sm text-gray-500">Yükleniyor…</p>}

            {!loading && items.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-gray-600">
                <p>Sepetiniz boş.</p>
                <Link
                  href="/"
                  onClick={closeDrawer}
                  className="rounded-md bg-black px-4 py-2 text-white"
                >
                  Alışverişe Başla
                </Link>
              </div>
            )}

            {!loading && items.length > 0 && (
              <ul className="space-y-4">
                {items.map((it) => (
                  <li key={it.id} className="flex gap-3">
                    <div className="relative h-20 w-20 overflow-hidden rounded-md bg-gray-50">
                      {it.image ? (
                        <Image
                          src={it.image}
                          alt={it.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-gray-400">
                          Görsel yok
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/products/${it.slug}`}
                        onClick={closeDrawer}
                        className="line-clamp-1 font-medium hover:underline"
                      >
                        {it.title}
                      </Link>

                      <div className="mt-1 text-sm text-gray-600">
                        {(it.price * it.quantity).toFixed(2)} {it.currency}
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          onClick={() => dec(it.id)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded border"
                          aria-label="Azalt"
                          variant="outline"
                        >
                          –
                        </Button>
                        <span className="w-6 text-center text-sm">
                          {it.quantity}
                        </span>
                        <Button
                          onClick={() => inc(it.id)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded border"
                          aria-label="Arttır"
                          variant="outline"
                        >
                          +
                        </Button>
                        <Button
                          onClick={() => removeItem(it.id)}
                          className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs"
                          variant="outline"
                          size="sm"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Sil
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ✅ alt kısım YALNIZCA sepet doluyken görünür */}
          {!isEmpty && (
            <div className="border-t p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">Toplam</span>
                <span className="text-base font-semibold">
                  {total.toFixed(2)} {currency}
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  disabled={proceedLoading || isEmpty}
                  onClick={proceedToCheckout}
                  className="flex-1 rounded-md bg-black px-4 py-2 text-center text-white disabled:opacity-60"
                  variant="default"
                >
                  {proceedLoading ? "Hazırlanıyor…" : "Ödeme Adımına Git"}
                </Button>
                <Link
                  href="/cart"
                  onClick={closeDrawer}
                  className="flex-1 rounded-md border px-4 py-2 text-center"
                >
                  Sepete Git
                </Link>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
