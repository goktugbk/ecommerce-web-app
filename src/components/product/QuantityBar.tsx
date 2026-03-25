"use client";

import { useState } from "react";
import AddToCartButton from "@/components/cart/AddToCartButton";
import { Button } from "@/components/ui/Button";

export default function QuantityBar({
  productId,
  max = 99,
  currency,
  price,
}: {
  productId: string;
  max?: number;
  currency: string;
  price: number;
}) {
  const [qty, setQty] = useState(1);

  const dec = () => setQty((q) => Math.max(1, q - 1));
  const inc = () => setQty((q) => Math.min(max, q + 1));

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-white p-3">
      {/* Adet seçici */}
      <div className="flex items-center rounded-lg border">
        <Button
          type="button"
          onClick={dec}
          className="px-3 py-2 text-lg leading-none hover:bg-gray-50"
          aria-label="Azalt"
          variant="secondary"
          size="sm"
        >
          −
        </Button>
        <input
          type="number"
          min={1}
          max={max}
          value={qty}
          onChange={(e) => {
            const v = Number(e.target.value || 1);
            setQty(Math.max(1, Math.min(max, v)));
          }}
          className="w-14 text-center outline-none"
        />
        <Button
          type="button"
          onClick={inc}
          className="px-3 py-2 text-lg leading-none hover:bg-gray-50"
          aria-label="Arttır"
          variant="secondary"
          size="sm"
        >
          +
        </Button>
      </div>

      {/* Toplam fiyat */}
      <div className="ml-1 text-sm text-gray-600">
        Toplam:{" "}
        <span className="font-medium">
          {(price * qty).toFixed(2)} {currency}
        </span>
      </div>

      {/* Sepete ekle */}
      <div className="ml-auto">
        <AddToCartButton productId={productId} quantity={qty} />
      </div>
    </div>
  );
}
