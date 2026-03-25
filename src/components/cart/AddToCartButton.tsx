// src/components/cart/AddToCartButton.tsx
"use client";

import { useState, useTransition } from "react";
import { useCartDrawer } from "@/lib/cart-drawer-store";
import { Button } from "@/components/ui/Button";

type Props = {
  productId: string;
  quantity?: number;
  className?: string;
  onAdded?: () => void;
};

export default function AddToCartButton({
  productId,
  quantity = 1,
  className = "",
  onAdded,
}: Props) {
  const { openDrawer } = useCartDrawer();
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  async function addOnce(qty: number) {
    const res = await fetch("/api/cart", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ productId, quantity: qty }),
    });

    // Beklenen: { ok: true } veya { error: string }
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      /* yoksay: boş/bozuk gövde */
    }

    if (!res.ok || !data || data.ok !== true) {
      const msg =
        (data && (data.error || data.message)) ||
        "Sepete eklenemedi. Lütfen tekrar deneyin.";
      throw new Error(msg);
    }
  }

  const handleAdd = () => {
    if (!productId) return;
    const qty = Math.max(1, Math.min(99, Number(quantity) || 1));

    setLoading(true);
    startTransition(async () => {
      try {
        await addOnce(qty);
        // Drawer’ı aç, callback tetikle
        openDrawer();
        onAdded?.();
      } catch (err: any) {
        // Basit hata bildirimi (istersen toast ile değiştir)
        console.error(err);
        alert(err?.message || "Bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    });
  };

  const disabled = loading || pending;

  return (
    <Button
      type="button"
      onClick={handleAdd}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      aria-busy={disabled}
    >
      {disabled ? "Ekleniyor…" : "Sepete Ekle"}
    </Button>
  );
}
