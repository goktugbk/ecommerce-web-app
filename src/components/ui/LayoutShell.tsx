// src/components/site/LayoutShell.tsx
import Header from "@/components/site/Header";
import PromoMarquee from "@/components/ui/PromoMarquee";
import CartDrawer from "@/components/cart/CartDrawer";
import Footer from "@/components/layout/Footer";
import HideOnCheckout from "@/components/ui/HideOnCheckout";

export default function LayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* /checkout altında görünmesin */}
      <HideOnCheckout>
        <Header />
        <PromoMarquee
          items={[
            "Hormonsuz Gıdalar",
            "1000 TL ve üzeri alışverişlerde sepette 250 TL indirim!",
            "Şeker gibi ve Taptaze",
          ]}
          durationSec={26}
          gap="20rem"
          height="44px"
          className="bg-black text-white"
        />
      </HideOnCheckout>

      {/* Sayfa içeriği için geniş konteyner */}
      <main className="mx-auto w-full max-w-screen-2xl px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* /checkout altında görünmesin */}
      <HideOnCheckout>
        <CartDrawer />
        <Footer />
      </HideOnCheckout>
    </>
  );
}
