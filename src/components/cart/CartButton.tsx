//src/componenrts/cart/CartButton.tsx
"use client";

import { ShoppingBag } from "lucide-react";
import { useCartDrawer } from "@/lib/cart-drawer-store";
import { Button } from "@/components/ui/Button";

export default function CartButton({ count = 0 }: { count?: number }) {
  const toggleDrawer = useCartDrawer((s) => s.toggleDrawer);
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={toggleDrawer}
      className="relative p-2 hover:opacity-75"
      aria-label="Sepet"
    >
      <ShoppingBag className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 rounded-full bg-black px-1.5 text-[10px] font-semibold text-white">
          {count}
        </span>
      )}
    </Button>
  );
}
