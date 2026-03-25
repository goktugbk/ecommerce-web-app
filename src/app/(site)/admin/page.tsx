import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-server";

export default async function AdminHomePage() {
  const me = await getSessionUser();
  if (!me || me.role !== "ADMIN") {
    redirect("/account");
  }

  return (
    <main className="space-y-6">
      <h2 className="text-2xl font-semibold">Admin Paneli</h2>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Link
          href="/admin/products"
          className="rounded-2xl border p-4 hover:bg-gray-50"
        >
          Ürünler
        </Link>
        <Link
          href="/admin/orders"
          className="rounded-2xl border p-4 hover:bg-gray-50"
        >
          Siparişler
        </Link>
        <Link
          href="/admin/users"
          className="rounded-2xl border p-4 hover:bg-gray-50"
        >
          Kullanıcılar
        </Link>
        <Link
          href="/admin/categories"
          className="rounded-2xl border p-4 hover:bg-gray-50"
        >
          Kategoriler
        </Link>
        <Link
          href="/admin/hero"
          className="rounded-2xl border p-4 hover:bg-gray-50"
        >
          Ana Sayfa (Hero)
        </Link>
        <Link
          href="/admin/featured"
          className="rounded-2xl border p-4 hover:bg-gray-50"
        >
          Yeni Gelenler (Featured)
        </Link>
      </div>
    </main>
  );
}
