import Link from "next/link";
import AccountNavLink from "./AccountNavLink";

export default function AccountSidebar({
  isAdmin = false,
}: {
  isAdmin?: boolean;
}) {
  return (
    <aside className="rounded-2xl border bg-white/70 p-5 shadow-sm ring-1 ring-black/5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight">Hesabım</h2>
        <Link
          href="/account/logout"
          className="mt-1 inline-block text-xs text-rose-600 hover:underline"
        >
          Çıkış yap
        </Link>
      </div>

      <nav className="space-y-6 text-sm">
        <section>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Kişisel Bilgilerim
          </div>
          <div className="space-y-1">
            <AccountNavLink href="/account" exact>
              Kişisel Bilgilerim
            </AccountNavLink>
            <AccountNavLink href="/account/addresses">
              Adreslerim
            </AccountNavLink>
            <AccountNavLink href="/account/favorites">
              Beğendiğim Ürünler
            </AccountNavLink>
          </div>
        </section>

        <section>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Sipariş Bilgilerim
          </div>
          <div className="space-y-1">
            <AccountNavLink href="/account/orders">Siparişlerim</AccountNavLink>
          </div>
        </section>

        {isAdmin && (
          <section>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Yönetim
            </div>
            <AccountNavLink href="/admin">Admin Paneline Git</AccountNavLink>
          </section>
        )}
      </nav>
    </aside>
  );
}
