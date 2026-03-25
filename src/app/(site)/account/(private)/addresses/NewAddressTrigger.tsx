"use client";

import { Plus } from "lucide-react";
import { useInlineNewAddress } from "./InlineNewAddress";
import { Button } from "@/components/ui/Button";

export default function NewAddressTrigger() {
  const { toggle, open } = useInlineNewAddress();
  return (
    <Button
      type="button"
      onClick={toggle}
      className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50"
      variant="outline"
      size="sm"
    >
      <Plus className="h-4 w-4" />
      {open ? "Formu Kapat" : "Yeni Adres"}
    </Button>
  );
}
