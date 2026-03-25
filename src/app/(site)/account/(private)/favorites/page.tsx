// src/app/(site)/account/favorites/page.tsx
import { requireUser } from "@/lib/auth-server";
export default async function FavoritesPage() {
  await requireUser("/account/favorites");
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Beğendiğim Ürünler</h1>
      {/* favoriler */}
    </div>
  );
}
