// src/app/(site)/account/profile/page.tsx
import { requireUser } from "@/lib/auth-server";

export default async function ProfilePage() {
  const me = await requireUser("/account/profile");
  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Profil</h1>
      <div className="rounded-xl border p-4">
        <div>
          <span className="text-gray-500">Ad Soyad:</span> {me.firstName}{" "}
          {me.lastName}
        </div>
        <div>
          <span className="text-gray-500">E-posta:</span> {me.email}
        </div>
        <div>
          <span className="text-gray-500">Rol:</span> {me.role}
        </div>
      </div>
    </div>
  );
}
