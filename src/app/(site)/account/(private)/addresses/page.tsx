// app/(site)/account/(private)/addresses/page.tsx
import { requireUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import AddressCard from "./AddressCard";
import {
  InlineNewAddressProvider,
  NewAddressTrigger,
  NewAddressPanel,
} from "./InlineNewAddress";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

export default async function AddressesPage() {
  const me = await requireUser("/account/addresses");

  // Kullanıcının varsayılan adresi
  const meUser = await prisma.user.findUnique({
    where: { id: me.id },
    select: { defaultAddressId: true },
  });

  // Adresleri çek (isDefault alanı yok)
  const addresses = await prisma.address.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      phone: true,
      line1: true,
      line2: true,
      district: true,
      city: true,
      postalCode: true,
      country: true,
      label: true,
      createdAt: true,
    },
  });

  // Varsayılan adresi başa al
  const defaultId = meUser?.defaultAddressId ?? null;
  const sorted = [...addresses].sort((a, b) => {
    if (a.id === defaultId && b.id !== defaultId) return -1;
    if (b.id === defaultId && a.id !== defaultId) return 1;
    return 0;
  });

  return (
    <InlineNewAddressProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">
            Adreslerim{" "}
            <span className="text-lg text-gray-400">({addresses.length})</span>
          </h1>
          <NewAddressTrigger />
        </div>

        <NewAddressPanel />

        <div className="grid gap-4 md:grid-cols-2">
          {sorted.length === 0 ? (
            <div className="rounded-xl border bg-white/60 p-6 text-sm text-gray-600">
              Kayıtlı adresiniz yok. Sağ üstten “+ Yeni adres ekle” ile adres oluşturabilirsiniz.
            </div>
          ) : (
            sorted.map((a) => (
              <AddressCard
                key={a.id}
                address={{ ...a, isDefault: a.id === defaultId }}
              />
            ))
          )}
        </div>
      </div>
    </InlineNewAddressProvider>
  );
}
