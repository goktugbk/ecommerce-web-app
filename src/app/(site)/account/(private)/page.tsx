// src/app/(site)/account/(private)/page.tsx
import { requireUser } from "@/lib/auth-server";
import ProfileForm from "./ProfileForm";
import { prisma } from "@/lib/prisma";
import { parsePhoneNumberFromString } from "libphonenumber-js";

function toE164(num?: string | null, country: "TR" = "TR") {
  if (!num) return "";
  try {
    const p = parsePhoneNumberFromString(num, country);
    return p?.number ?? "";
  } catch {
    return "";
  }
}

export default async function AccountHomePage() {
  const me = await requireUser("/account");
  const user = await prisma.user.findUnique({
    where: { id: me.id },
    select: { firstName: true, lastName: true, email: true, phone: true },
  });

  const phoneE164 = toE164(user?.phone, "TR");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        Kişisel Bilgilerim
      </h1>

      <div className="rounded-2xl border bg-white/60 p-6 shadow-sm ring-1 ring-black/5">
        <ProfileForm
          firstName={user?.firstName ?? ""}
          lastName={user?.lastName ?? ""}
          email={user?.email ?? me.email}
          phone={phoneE164}
        />
      </div>
    </div>
  );
}
