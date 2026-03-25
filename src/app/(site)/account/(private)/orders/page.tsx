// src/app/(site)/account/(private)/orders/page.tsx
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

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams?: { page?: string };
}) {
  const me = await requireUser("/account/login?returnTo=/account/orders");
  const page = Math.max(1, Number(searchParams?.page ?? "1"));
  const pageSize = 10;
  const skip = (page - 1) * pageSize;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
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
                id: true,
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
    }),
    prisma.order.count({ where: { userId: me.id } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Başlık */}
      <div className="space-y-2">
        <Breadcrumbs
          items={[
            { label: "Hesap", href: "/account" },
            { label: "Siparişlerim" },
          ]}
        />
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">
            Siparişlerim
          </h1>
          <Link
            href="/products"
            className="text-sm text-blue-600 hover:underline"
          >
            Alışverişe devam et
          </Link>
        </div>
      </div>

      {orders.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <ul className="space-y-4">
            {orders.map((o) => (
              <li
                key={o.id}
                className="rounded-2xl border bg-white/60 p-4 shadow-sm ring-1 ring-black/5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-gray-600">
                    <div className="font-medium text-gray-900">
                      {o.orderCode
                        ? `Sipariş #${o.orderCode}`
                        : `Sipariş #${o.id.slice(0, 8).toUpperCase()}`}
                    </div>
                    <div>{new Date(o.createdAt).toLocaleString("tr-TR")}</div>
                  </div>

                  <div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusBadgeClasses(
                        o.status,
                      )}`}
                    >
                      {ORDER_STATUS_LABELS[o.status] ?? o.status}
                    </span>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {fmt(o.totalAmount, o.currency)}
                    </div>
                    <Link
                      href={`/account/orders/${o.id}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Detayı gör
                    </Link>
                  </div>
                </div>

                {/* Ürün kartları */}
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {o.items.slice(0, 4).map((it) => {
                    const title =
                      it.product?.title ?? `Ürün #${it.productId.slice(0, 6)}`;
                    const img = it.product?.images?.[0]?.url;

                    return (
                      <div
                        key={it.id}
                        className="flex items-center gap-3 rounded-xl border bg-white/70 p-3"
                      >
                        <div className="relative h-14 w-14 overflow-hidden rounded-lg ring-1 ring-black/5">
                          {img ? (
                            <Image
                              alt={title}
                              src={img}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                              No Image
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-gray-900">
                            {title}
                          </div>
                          <div className="text-xs text-gray-600">
                            {it.quantity} × {fmt(it.unitPrice, o.currency)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>

          <Pagination page={page} totalPages={totalPages} />
        </>
      )}
    </div>
  );
}

/* ---------------------- Alt Bileşenler ---------------------- */

function EmptyState() {
  return (
    <div className="rounded-2xl border bg-white/60 p-10 text-center ring-1 ring-black/5">
      <div className="text-lg font-medium text-gray-900">
        Henüz siparişiniz yok
      </div>
      <p className="mt-1 text-sm text-gray-600">
        Ürünlere göz atarak başlayabilirsiniz.
      </p>
      <div className="mt-4">
        <Link
          href="/products"
          className="inline-flex items-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Ürünlere Git
        </Link>
      </div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  const prev = page > 1 ? `/account/orders?page=${page - 1}` : null;
  const next = page < totalPages ? `/account/orders?page=${page + 1}` : null;

  return (
    <div className="flex items-center justify-center gap-2">
      <Link
        aria-disabled={!prev}
        href={prev ?? "#"}
        className={`rounded-xl px-3 py-1.5 text-sm ring-1 ring-black/10 ${
          prev
            ? "text-gray-900 hover:bg-gray-50"
            : "pointer-events-none text-gray-400 bg-gray-50"
        }`}
      >
        Önceki
      </Link>
      <span className="text-sm text-gray-600">
        Sayfa <strong>{page}</strong> / {totalPages}
      </span>
      <Link
        aria-disabled={!next}
        href={next ?? "#"}
        className={`rounded-xl px-3 py-1.5 text-sm ring-1 ring-black/10 ${
          next
            ? "text-gray-900 hover:bg-gray-50"
            : "pointer-events-none text-gray-400 bg-gray-50"
        }`}
      >
        Sonraki
      </Link>
    </div>
  );
}
