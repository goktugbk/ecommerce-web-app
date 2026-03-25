import Link from "next/link";
import { Search } from "lucide-react";

import HeaderUser from "@/components/site/HeaderUser"; // server
import CartButton from "@/components/cart/CartButton"; // client
import CartDrawer from "@/components/cart/CartDrawer"; // client
import NavLink from "@/components/site/NavLink"; // client

export default async function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-white">
      {/* Sepet çekmecesi her sayfada hazır */}
      <CartDrawer />

      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4">
        {/* Menü */}
        <nav className="hidden items-center gap-1 md:flex">
          <NavLink href="/">Anasayfa</NavLink>
          <NavLink href="/products">Tüm Ürünler</NavLink>
          <NavLink href="/collection/new">Yeni Koleksiyon</NavLink>
        </nav>

        {/* Logo */}
        <Link href="/" className="text-2xl font-extrabold tracking-widest">
          MANAV SEPETİM
        </Link>

        {/* Sağ taraf */}
        <div className="flex items-center gap-5">
          {/* Arama */}
          <Link
            href="/search"
            className="p-2 hover:opacity-75"
            aria-label="Ara"
          >
            <Search className="h-5 w-5" />
          </Link>

          {/* Avatar (login veya hesap) */}
          <HeaderUser />

          {/* Sepet */}
          <CartButton count={0} />
        </div>
      </div>
    </header>
  );
}
