"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import AddressForm from "./AddressForm";
import { Button } from "@/components/ui/Button";

/* URL senkron state */
function useOpenState() {
  const sp = useSearchParams();
  const router = useRouter();
  const initial = sp?.get("new") === "1";
  const [open, setOpen] = React.useState<boolean>(initial);

  React.useEffect(() => {
    const next = sp?.get("new") === "1";
    setOpen((prev) => (prev !== next ? next : prev));
  }, [sp]);

  const set = React.useCallback(
    (val: boolean) => {
      setOpen(val);
      const url = new URL(window.location.href);
      if (val) url.searchParams.set("new", "1");
      else url.searchParams.delete("new");
      router.replace(url.toString(), { scroll: false });
    },
    [router],
  );

  return { open, setOpen: set };
}

/* Context */
type InlineCtx = { open: boolean; setOpen: (v: boolean) => void };
const InlineContext = React.createContext<InlineCtx | null>(null);
function useInlineCtx() {
  const ctx = React.useContext(InlineContext);
  if (!ctx)
    throw new Error(
      "InlineNewAddress bileşenleri Provider dışında kullanılamaz.",
    );
  return ctx;
}

/* Provider */
export function InlineNewAddressProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const state = useOpenState();
  return (
    <InlineContext.Provider value={state}>{children}</InlineContext.Provider>
  );
}

/* Trigger */
export function NewAddressTrigger() {
  const { open, setOpen } = useInlineCtx();
  return (
    <Button
      type="button"
      onClick={() => setOpen(!open)}
      className="inline-flex items-center gap-1 text-sm font-semibold hover:underline"
      variant="link"
    >
      {open ? (
        <ChevronUp className="h-4 w-4" />
      ) : (
        <ChevronDown className="h-4 w-4" />
      )}
      {open ? "Yeni adresi gizle" : "+ Yeni adres ekle"}
    </Button>
  );
}

/* Panel */
export function NewAddressPanel() {
  const { open, setOpen } = useInlineCtx();
  if (!open) return null;

  return (
    <div className="rounded-2xl border bg-white/60 p-6 shadow-sm ring-1 ring-black/5">
      <h2 className="mb-4 text-lg font-semibold">Adres Oluştur</h2>
      <AddressForm
        onSaved={() => {
          setOpen(false);
        }}
      />
    </div>
  );
}

/* (İstersen) namespace default da bırakabilirsin — ama zorunlu değil
const InlineNewAddress = {
  Provider: InlineNewAddressProvider,
  Trigger: NewAddressTrigger,
  Panel: NewAddressPanel,
};
export default InlineNewAddress;
*/
