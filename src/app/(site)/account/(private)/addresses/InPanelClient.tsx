"use client";

import { useInlineNewAddress } from "./InlineNewAddress";
import NewAddressForm from "./NewAddressForm";

export default function InlinePanelClient() {
  const { open } = useInlineNewAddress();

  if (!open) return null;

  return (
    <div className="animate-in fade-in-0 slide-in-from-top-2">
      <NewAddressForm />
    </div>
  );
}
