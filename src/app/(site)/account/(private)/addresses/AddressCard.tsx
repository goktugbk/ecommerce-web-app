"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { useFormStatus } from "react-dom";
import { setDefaultAddressAction, deleteAddressAction } from "./actions";

type Address = {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  district: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean; // page.tsx'te defaultAddressId'den türetiliyor
};

function PendingButton(props: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
  type?: "button" | "submit" | "reset";
}) {
  const { pending } = useFormStatus();
  const { children, pendingText = "İşleniyor…", type = "submit", ...rest } = props;
  return (
    <Button type={type} disabled={pending} aria-busy={pending} {...rest}>
      {pending ? pendingText : children}
    </Button>
  );
}

export default function AddressCard({ address }: { address: Address }) {
  // Silmeden önce onay
  const onDeleteSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const ok = window.confirm("Bu adres silinecek. Emin misiniz?");
    if (!ok) e.preventDefault();
  };

  return (
    <div className="rounded-xl border p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-medium">
          {address.fullName}
          {address.isDefault && (
            <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              Varsayılan
            </span>
          )}
        </div>
      </div>

      <div className="text-sm text-gray-700">
        <div>{address.line1}</div>
        {address.line2 ? <div>{address.line2}</div> : null}
        <div>
          {address.district}, {address.city} {address.postalCode}
        </div>
        <div className="mt-1">{address.phone}</div>
      </div>

      <div className="mt-3 flex gap-2">
        {/* Varsayılan değilse "Varsayılan Yap" göster */}
        {!address.isDefault && (
          <form action={setDefaultAddressAction} className="m-0">
            <input type="hidden" name="id" value={address.id} />
            <PendingButton
              variant="outline"
              size="sm"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
              pendingText="Ayarlandı…"
            >
              Varsayılan Yap
            </PendingButton>
          </form>
        )}

        {/* Silme (varsayılan olsa da) */}
        <form action={deleteAddressAction} className="ml-auto m-0" onSubmit={onDeleteSubmit}>
          <input type="hidden" name="id" value={address.id} />
          <PendingButton
            variant="destructive"
            size="sm"
            className="rounded-md border px-3 py-1.5 text-sm"
            pendingText="Siliniyor…"
          >
            Sil
          </PendingButton>
        </form>
      </div>
    </div>
  );
}
