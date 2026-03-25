// src/app/(site)/admin/orders/[id]/page.tsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Button } from "@/components/ui/Button";

/* -------- helpers -------- */
function toNum(x: any): number {
  if (typeof x === "number") return x;
  if (x && typeof x.toNumber === "function") {
    try {
      return x.toNumber();
    } catch {}
  }
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function trStatus(s: string) {
  const map: Record<string, string> = {
    PENDING: "Beklemede",
    PAID: "Ödendi",
    SHIPPED: "Kargolandı",
    DELIVERED: "Teslim Edildi",
    CANCELED: "İptal Edildi",
  };
  return map[s] ?? s;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
    PAID: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
    SHIPPED: "bg-blue-100 text-blue-800 ring-1 ring-blue-200",
    DELIVERED: "bg-teal-100 text-teal-800 ring-1 ring-teal-200",
    CANCELED: "bg-gray-200 text-gray-700 ring-1 ring-gray-300",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-800 ring-1 ring-gray-200"}`}
    >
      {trStatus(status)}
    </span>
  );
}

function fullName(first?: string | null, last?: string | null) {
  return `${first ?? ""} ${last ?? ""}`.trim();
}

/* -------- server action: durum güncelle -------- */
export async function updateOrderStatus(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  const allowed = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELED"];
  if (!id || !allowed.includes(status)) return;

  await prisma.order.update({ where: { id }, data: { status } });
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath(`/admin/orders`);
}

/* -------- page -------- */
export default async function AdminOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          Address: {
            orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
            take: 1,
            select: {
              line1: true,
              line2: true,
              city: true,
              state: true, // ilçe/semt
              postal: true,
              country: true,
            },
          },
        },
      },
      items: {
        include: {
          product: { select: { title: true, price: true, currency: true } },
        },
      },
    },
  });

  if (!order) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">Sipariş bulunamadı.</p>
        <Link
          href="/admin/orders"
          className="mt-3 inline-block text-sm text-blue-600 underline"
        >
          ← Listeye dön
        </Link>
      </div>
    );
  }

  const subtotal = order.items.reduce((s, it) => {
    const unit = toNum(it.unitPrice ?? it.product?.price);
    return s + unit * (it.quantity ?? 1);
  }, 0);

  /* ---------- Müşteri adı & e-posta (öncelik: ship/contact snapshot -> user) ---------- */
  const snapshotName =
    fullName(order.shipFirstName, order.shipLastName) ||
    (order.contactName ?? "");
  const customerName =
    snapshotName ||
    fullName(order.user?.firstName, order.user?.lastName) ||
    order.user?.email ||
    "Misafir";

  const customerEmail =
    order.shipEmail ?? order.contactEmail ?? order.user?.email ?? "-";
  const customerPhone = order.shipPhone ?? order.contactPhone ?? "-";

  /* ---------- Teslimat Adresi (öncelik: snapshot; yoksa user.Address[0]) ---------- */
  const hasShipSnapshot = !!(
    order.shipLine1 ||
    order.shipLine2 ||
    order.shipDistrict ||
    order.shipCity ||
    order.shipPostal ||
    order.shipCountry
  );

  const addrLine_snapshot = [order.shipLine1, order.shipLine2]
    .filter(Boolean)
    .join(", ");
  const addrCityLine_snapshot = [
    order.shipDistrict,
    order.shipCity,
    order.shipPostal,
  ]
    .filter(Boolean)
    .join(", ");
  const addrCountry_snapshot = order.shipCountry ?? "TR";

  const userAddr = order.user?.Address?.[0];
  const addrLine_user = [userAddr?.line1, userAddr?.line2]
    .filter(Boolean)
    .join(", ");
  const addrCityLine_user = [userAddr?.state, userAddr?.city, userAddr?.postal]
    .filter(Boolean)
    .join(", ");
  const addrCountry_user = userAddr?.country;

  const hasAddress =
    hasShipSnapshot ||
    Boolean(addrLine_user || addrCityLine_user || addrCountry_user);

  return (
    <div className="mx-auto w-full max-w-6xl p-6 space-y-6">
      <div>
        <Link href="/admin/orders" className="text-sm text-blue-600 underline">
          ← Siparişler
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">
          Sipariş {order.orderCode ?? `#${order.id.slice(0, 8)}`}
        </h1>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">
          {new Date(order.createdAt).toLocaleString("tr-TR")}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Ürünler */}
        <div className="rounded-xl border p-4 lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold">Ürünler</h2>
          <div className="overflow-x-auto">
            <table className="min-w-[680px] w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr className="[&>th]:p-3">
                  <th>Ürün</th>
                  <th>Birim Fiyat</th>
                  <th>Adet</th>
                  <th>Tutar</th>
                </tr>
              </thead>
              <tbody className="[&>tr]:border-t">
                {order.items.map((it) => {
                  const unit = toNum(it.unitPrice ?? it.product?.price);
                  const qty = it.quantity ?? 1;
                  const line = unit * qty;
                  const currency = it.product?.currency ?? order.currency;
                  return (
                    <tr key={it.id}>
                      <td className="p-3">
                        {it.product?.title ?? it.productId}
                      </td>
                      <td className="p-3">
                        {unit.toFixed(2)} {currency}
                      </td>
                      <td className="p-3">{qty}</td>
                      <td className="p-3">
                        {line.toFixed(2)} {currency}
                      </td>
                    </tr>
                  );
                })}
                {order.items.length === 0 && (
                  <tr>
                    <td className="p-6 text-center text-gray-500" colSpan={4}>
                      Ürün yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sağ kolon */}
        <div className="space-y-4">
          {/* Özet */}
          <div className="rounded-xl border p-4">
            <h3 className="mb-2 text-sm font-semibold">Sipariş Özeti</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Ara Toplam</span>
                <span>
                  {subtotal.toFixed(2)} {order.currency}
                </span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Toplam</span>
                <span>
                  {toNum(order.totalAmount).toFixed(2)} {order.currency}
                </span>
              </div>
              <div className="pt-2 flex items-center gap-2">
                <span className="text-xs text-gray-500">Durum:</span>
                <StatusBadge status={order.status} />
              </div>
              {order.orderCode && (
                <div className="text-xs text-gray-500">
                  Sipariş Kodu:{" "}
                  <span className="font-mono">{order.orderCode}</span>
                </div>
              )}
              <div className="text-xs text-gray-500 break-all">
                ID: {order.id}
              </div>
            </div>
          </div>

          {/* Durum Güncelle */}
          <div className="rounded-xl border p-4">
            <h3 className="mb-2 text-sm font-semibold">Durum Güncelle</h3>
            <form
              action={updateOrderStatus}
              className="flex items-center gap-2"
            >
              <input type="hidden" name="id" value={order.id} />
              <select
                name="status"
                defaultValue={order.status}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                <option value="PENDING">Beklemede</option>
                <option value="PAID">Ödendi</option>
                <option value="SHIPPED">Kargolandı</option>
                <option value="DELIVERED">Teslim Edildi</option>
                <option value="CANCELED">İptal Edildi</option>
              </select>
              <Button
                type="submit"
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90"
                variant="default"
              >
                Kaydet
              </Button>
            </form>
            <p className="mt-2 text-xs text-gray-500">
              Kaydet’e bastıktan sonra rozet otomatik güncellenir.
            </p>
          </div>

          {/* Müşteri */}
          <div className="rounded-xl border p-4">
            <h3 className="mb-2 text-sm font-semibold">Müşteri</h3>
            <div className="text-sm space-y-0.5">
              <div className="font-medium">{customerName}</div>
              <div className="text-gray-600">{customerEmail}</div>
              <div className="text-gray-600">{customerPhone}</div>
            </div>
          </div>

          {/* Teslimat Adresi (Önce snapshot, yoksa kullanıcı adresi) */}
          <div className="rounded-xl border p-4">
            <h3 className="mb-2 text-sm font-semibold">Teslimat Adresi</h3>

            {hasShipSnapshot ? (
              <div className="text-sm leading-6">
                {(order.shipFirstName || order.shipLastName) && (
                  <div className="font-medium">
                    {fullName(order.shipFirstName, order.shipLastName)}
                  </div>
                )}
                {addrLine_snapshot && (
                  <div className="text-gray-700">{addrLine_snapshot}</div>
                )}
                {addrCityLine_snapshot && (
                  <div className="text-gray-700">{addrCityLine_snapshot}</div>
                )}
                {addrCountry_snapshot && (
                  <div className="text-gray-700">{addrCountry_snapshot}</div>
                )}
              </div>
            ) : hasAddress ? (
              <div className="text-sm leading-6">
                {addrLine_user && (
                  <div className="text-gray-700">{addrLine_user}</div>
                )}
                {addrCityLine_user && (
                  <div className="text-gray-700">{addrCityLine_user}</div>
                )}
                {addrCountry_user && (
                  <div className="text-gray-700">{addrCountry_user}</div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                Adres bilgisi bulunamadı.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
