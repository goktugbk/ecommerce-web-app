// src/components/checkout/CheckoutSummary.tsx
"use client";

type Item = {
  id: string;
  title: string;
  image?: string | null;
  price: number;
  currency: string;
  quantity: number;
};

type Props = {
  items: Item[];
  subtotal: number;
  currency?: string;
  shippingFee?: number;   // default 0
  paymentFee?: number;    // default 0
  discount?: number;      // default 0 (pozitif sayı: düşülecek)
  note?: string;          // alt açıklama
};

export default function CheckoutSummary({
  items,
  subtotal,
  currency = "TRY",
  shippingFee = 0,
  paymentFee = 0,
  discount = 0,
  note = "Kargo ücreti, kargo adımında seçiminize göre güncellenir.",
}: Props) {
  // Toplam: sadece verilen kalemleri toplar. İçeride ekstra fetch/hesap YOK.
  const total = Math.max(0, subtotal + shippingFee + paymentFee - discount);

  return (
    <aside className="rounded-2xl border p-4 md:p-6">
      <h3 className="text-lg font-semibold">Sipariş Özeti</h3>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-gray-600">Sepetiniz boş.</p>
      ) : (
        <>
          <ul className="mt-3 divide-y">
            {items.map((it) => (
              <li key={it.id} className="py-3 flex items-center gap-3">
                {it.image ? (
                  <img
                    src={it.image}
                    alt={it.title}
                    className="h-14 w-14 rounded-lg object-cover border"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-lg border bg-gray-50" />
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{it.title}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    Adet: <span className="font-medium">{it.quantity}</span>
                  </p>
                </div>

                <div className="whitespace-nowrap font-medium">
                  {(it.price * it.quantity).toFixed(2)} {it.currency}
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Ara Toplam</span>
              <span>
                {subtotal.toFixed(2)} {currency}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Kargo</span>
              <span>
                {shippingFee.toFixed(2)} {currency}
              </span>
            </div>

            {paymentFee ? (
              <div className="flex justify-between">
                <span>Ödeme Ücreti</span>
                <span>
                  {paymentFee.toFixed(2)} {currency}
                </span>
              </div>
            ) : null}

            {discount ? (
              <div className="flex justify-between text-emerald-700">
                <span>İndirim</span>
                <span>
                  -{discount.toFixed(2)} {currency}
                </span>
              </div>
            ) : null}

            <div className="border-t pt-2 flex justify-between text-base font-semibold">
              <span>Genel Toplam</span>
              <span>
                {total.toFixed(2)} {currency}
              </span>
            </div>
          </div>

          {note ? (
            <p className="mt-1 text-xs text-gray-500">{note}</p>
          ) : null}
        </>
      )}
    </aside>
  );
}
