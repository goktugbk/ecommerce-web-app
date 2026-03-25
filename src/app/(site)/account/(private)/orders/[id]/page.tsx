// src/app/(site)/account/(private)/orders/[id]/page.tsx
import { requireUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { ORDER_STATUS_LABELS, statusBadgeClasses } from "@/lib/order-status";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

function fmt(n: any, ccy: string) {
  const val = typeof n === "number" ? n : Number(n?.toString?.() ?? n);
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: ccy || "TRY",
  }).format(val || 0);
}

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const me = await requireUser("/account/login?returnTo=/account/orders");

  const order = await prisma.order.findFirst({
    where: { id: params.id, userId: me.id },
    select: {
      id: true,
      orderCode: true,
      status: true,
      totalAmount: true,
      currency: true,
      createdAt: true,
      items: {
        select: {
          id: true,
          productId: true,
          quantity: true,
          unitPrice: true,
          product: {
            select: {
              title: true,
              slug: true,
              images: {
                select: { url: true, isPrimary: true },
                orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!order) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Sipariş Bulunamadı
        </h1>
        <Link
          href="/account/orders"
          className="text-sm text-blue-600 hover:underline"
        >
          Siparişlerime dön
        </Link>
      </div>
    );
  }

  const subTotal = order.items.reduce(
    (s, it) => s + Number(it.unitPrice) * it.quantity,
    0,
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Başlık */}
      <div className="space-y-2">
        <Breadcrumbs
          items={[
            { label: "Hesap", href: "/account" },
            { label: "Siparişlerim", href: "/account/orders" },
            {
              label: order.orderCode
                ? `#${order.orderCode}`
                : `#${order.id.slice(0, 8).toUpperCase()}`,
            },
          ]}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {order.orderCode
                ? `Sipariş #${order.orderCode}`
                : `Sipariş #${order.id.slice(0, 8).toUpperCase()}`}
            </h1>
            <div className="text-sm text-gray-600">
              {new Date(order.createdAt).toLocaleString("tr-TR")}
            </div>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusBadgeClasses(order.status)}`}
          >
            {ORDER_STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>
      </div>

      {/* Sipariş kalemleri */}
      <div className="rounded-2xl border bg-white/60 p-4 ring-1 ring-black/5">
        <div className="grid gap-4">
          {order.items.map((it) => {
            const title =
              it.product?.title ?? `Ürün #${it.productId.slice(0, 6)}`;
            const img = it.product?.images?.[0]?.url;

            return (
              <div key={it.id} className="flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-lg ring-1 ring-black/5">
                  {img ? (
                    <Image
                      src={img}
                      alt={title}
                      fill
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-gray-900">
                    {title}
                  </div>
                  <div className="text-xs text-gray-600">
                    {it.quantity} × {fmt(it.unitPrice, order.currency)}
                  </div>
                </div>
                <div className="text-sm font-medium">
                  {fmt(Number(it.unitPrice) * it.quantity, order.currency)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 border-t pt-4">
          <div className="flex justify-between text-sm">
            <span>Ara Toplam</span>
            <span>{fmt(subTotal, order.currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Genel Toplam</span>
            <span className="font-semibold">
              {fmt(order.totalAmount, order.currency)}
            </span>
          </div>
        </div>
      </div>

      <Link
        href="/account/orders"
        className="text-sm text-blue-600 hover:underline"
      >
        ← Siparişlerime dön
      </Link>
    </div>
  );
}
