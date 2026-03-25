// src/app/(site)/account/(private)/layout.tsx
import Link from "next/link";
import LogoutButton from "@/components/account/LogoutButton";
import AccountNavLink from "@/components/account/AccountNavLink";
import { requireUser } from "@/lib/auth-server";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await requireUser("/account/login?returnTo=/account");
  const isAdmin = me.role === "ADMIN";

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-6 lg:px-8 py-8">
      {/* 12 kolon: aside 3, içerik 9 */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Sticky menü */}
        <aside
          className="
            lg:col-span-3 lg:sticky lg:top-28 self-start
            z-10 bg-white/90 backdrop-blur-sm
            rounded-xl ring-1 ring-black/5 p-4
          "
        >
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Hesabım</h2>
              <div className="mt-1">
                <LogoutButton />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-500">
                Kişisel Bilgilerim
              </h3>
              <nav className="grid gap-1 text-sm">
                <AccountNavLink href="/account" exact>
                  Kişisel Bilgilerim
                </AccountNavLink>
                <AccountNavLink href="/account/addresses">
                  Adreslerim
                </AccountNavLink>
                <AccountNavLink href="/account/favorites">
                  Beğendiğim Ürünler
                </AccountNavLink>
              </nav>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-500">
                Sipariş Bilgilerim
              </h3>
              <nav className="grid gap-1 text-sm">
                <AccountNavLink href="/account/orders">
                  Siparişlerim
                </AccountNavLink>
              </nav>
            </div>

            {isAdmin && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-500">Yönetim</h3>
                <Link
                  href="/admin"
                  className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium
                             text-gray-900 ring-1 ring-gray-200 hover:bg-gray-50"
                >
                  Admin Paneline Git
                </Link>
              </div>
            )}
          </div>
        </aside>

        {/* İçerik sütunu */}
        <main className="lg:col-span-9 min-w-0 z-0">{children}</main>
      </div>
    </div>
  );
}
