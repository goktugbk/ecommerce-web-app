// src/app/(site)/admin/orders/page.tsx
import { prisma } from "@/lib/prisma";
import AdminBackLink from "@/components/admin/AdminBackLink";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

/* ---------- helpers ---------- */
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
function fullName(first?: string | null, last?: string | null) {
  return `${first ?? ""} ${last ?? ""}`.trim();
}
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
    PAID: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
    SHIPPED: "bg-blue-100 text-blue-800 ring-1 ring-blue-200",
    DELIVERED: "bg-teal-100 text-teal-800 ring-1 ring-teal-200",
    CANCELED: "bg-gray-200 text-gray-700 ring-1 ring-gray-300",
  };
  const tr: Record<string, string> = {
    PENDING: "Beklemede",
    PAID: "Ödendi",
    SHIPPED: "Kargolandı",
    DELIVERED: "Teslim Edildi",
    CANCELED: "İptal Edildi",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-800 ring-1 ring-gray-200"}`}
    >
      {tr[status] ?? status}
    </span>
  );
}

/* ---------- page ---------- */
export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams?: { q?: string; page?: string; status?: string };
}) {
  const q = (searchParams?.q ?? "").trim();
  const page = Math.max(1, Number(searchParams?.page ?? 1) || 1);
  const take = 20;
  const skip = (page - 1) * take;
  const statusFilter = (searchParams?.status ?? "").toUpperCase();

  const where: any = {};
  if (q) {
    // kullanıcı + snapshot alanlarında arama
    where.OR = [
      { id: { contains: q, mode: "insensitive" } },
      { orderCode: { contains: q, mode: "insensitive" } },
      { contactName: { contains: q, mode: "insensitive" } },
      { contactEmail: { contains: q, mode: "insensitive" } },
      { contactPhone: { contains: q, mode: "insensitive" } },
      { shipFirstName: { contains: q, mode: "insensitive" } },
      { shipLastName: { contains: q, mode: "insensitive" } },
      { shipEmail: { contains: q, mode: "insensitive" } },
      { shipPhone: { contains: q, mode: "insensitive" } },
      { shipLine1: { contains: q, mode: "insensitive" } },
      { shipLine2: { contains: q, mode: "insensitive" } },
      { shipDistrict: { contains: q, mode: "insensitive" } },
      { shipCity: { contains: q, mode: "insensitive" } },
      { shipPostal: { contains: q, mode: "insensitive" } },
      { user: { is: { email: { contains: q, mode: "insensitive" } } } },
      { user: { is: { firstName: { contains: q, mode: "insensitive" } } } },
      { user: { is: { lastName: { contains: q, mode: "insensitive" } } } },
    ];
  }
  if (
    ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELED"].includes(
      statusFilter,
    )
  ) {
    where.status = statusFilter;
  }

  const [rows, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      select: {
        id: true,
        orderCode: true,
        totalAmount: true,
        currency: true,
        status: true,
        createdAt: true,

        // snapshot (öncelikli gösterim)
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        shipFirstName: true,
        shipLastName: true,
        shipEmail: true,
        shipPhone: true,
        shipLine1: true,
        shipLine2: true,
        shipDistrict: true,
        shipCity: true,
        shipPostal: true,
        shipCountry: true,

        // fallback user
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },

        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / take));

  const getDisplayName = (o: (typeof rows)[number]) => {
    const snap = fullName(o.shipFirstName, o.shipLastName);
    if (snap) return snap;
    if (o.contactName) return o.contactName;
    const userName = fullName(o.user?.firstName, o.user?.lastName);
    return userName || o.user?.email || "Misafir";
  };

  const getDisplayEmailPhone = (o: (typeof rows)[number]) => {
    const email = o.shipEmail ?? o.contactEmail ?? o.user?.email ?? "-";
    const phone = o.shipPhone ?? o.contactPhone ?? "-";
    return { email, phone };
  };

  const getDisplayAddress = (o: (typeof rows)[number]) => {
    const line = [o.shipLine1, o.shipLine2].filter(Boolean).join(", ");
    const city = [o.shipDistrict, o.shipCity, o.shipPostal]
      .filter(Boolean)
      .join(", ");
    const country = o.shipCountry ?? undefined;
    const parts = [line || undefined, city || undefined, country].filter(
      Boolean,
    );
    return parts.join(" • ");
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      {/* başlık + admin’e dön (tek buton) */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <AdminBackLink />
      </div>

      <div className="rounded-2xl border bg-white shadow-sm">
        {/* sticky filtre bar */}
        <div className="sticky top-0 z-10 rounded-t-2xl border-b bg-white/80 p-4 backdrop-blur">
          <h2 className="mb-3 text-lg font-semibold">Siparişler</h2>
          <form className="flex flex-wrap items-center gap-3">
            <input
              name="q"
              defaultValue={q}
              placeholder="Sipariş kodu / ad-soyad / e-posta / telefon / adres"
              className="w-80 rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            />
            <select
              name="status"
              defaultValue={statusFilter || ""}
              className="rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            >
              <option value="">Tümü (durum)</option>
              <option value="PENDING">Beklemede</option>
              <option value="PAID">Ödendi</option>
              <option value="SHIPPED">Kargolandı</option>
              <option value="DELIVERED">Teslim Edildi</option>
              <option value="CANCELED">İptal Edildi</option>
            </select>
            <Button
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90"
              variant="default"
            >
              Filtrele
            </Button>
          </form>
        </div>

        {/* tablo */}
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr className="[&>th]:px-4 [&>th]:py-3">
                <th>Tarih</th>
                <th>Sipariş</th>
                <th>Müşteri</th>
                <th>Adres</th>
                <th>Ürün Adedi</th>
                <th className="text-right">Tutar</th>
                <th>Durum</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="[&>tr]:border-t">
              {rows.map((o, idx) => {
                const displayName = getDisplayName(o);
                const { email, phone } = getDisplayEmailPhone(o);
                const address = getDisplayAddress(o);
                return (
                  <tr
                    key={o.id}
                    className={idx % 2 === 1 ? "bg-gray-50/30" : ""}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(o.createdAt).toLocaleString("tr-TR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {o.orderCode ?? `#${o.id.slice(0, 8)}`}
                        </span>
                        <span className="text-xs text-gray-500 truncate max-w-[220px]">
                          {o.id}
                        </span>
                      </div>
                    </td>

                    {/* Müşteri */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col max-w-[240px]">
                        <span className="truncate" title={displayName}>
                          {displayName}
                        </span>
                        <span
                          className="text-xs text-gray-500 truncate"
                          title={email}
                        >
                          {email}
                        </span>
                        <span
                          className="text-xs text-gray-500 truncate"
                          title={phone}
                        >
                          {phone}
                        </span>
                      </div>
                    </td>

                    {/* Adres (snapshot) */}
                    <td className="px-4 py-3">
                      {address ? (
                        <div
                          className="max-w-[320px] truncate text-gray-700"
                          title={address}
                        >
                          {address}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3">{o._count.items}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {toNum(o.totalAmount).toFixed(2)} {o.currency}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
                      >
                        Görüntüle
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td
                    className="px-4 py-10 text-center text-gray-500"
                    colSpan={8}
                  >
                    Kayıt bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* sayfalama */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-sm text-gray-600">
          <div>
            Toplam {total} kayıt • Sayfa {page}/{totalPages}
          </div>
          <div className="flex gap-2">
            <Link
              href={{
                pathname: "/admin/orders",
                query: { q, status: statusFilter, page: Math.max(1, page - 1) },
              }}
              className={`rounded-lg border px-3 py-1 ${page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-gray-50"}`}
            >
              ‹ Önceki
            </Link>
            <Link
              href={{
                pathname: "/admin/orders",
                query: {
                  q,
                  status: statusFilter,
                  page: Math.min(totalPages, page + 1),
                },
              }}
              className={`rounded-lg border px-3 py-1 ${page * take >= total ? "pointer-events-none opacity-40" : "hover:bg-gray-50"}`}
            >
              Sonraki ›
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
