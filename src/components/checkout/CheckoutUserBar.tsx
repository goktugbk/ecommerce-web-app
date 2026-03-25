// src/components/checkout/CheckoutUserBar.tsx
import { getSessionUser } from "@/lib/auth-server";

export default async function CheckoutUserBar() {
  const me = await getSessionUser();

  if (!me) {
    // Giriş yoksa login’e yönlendiren küçük bir bar
    return (
      <div className="mb-4 rounded-xl border bg-white p-3 text-sm">
        Devam etmek için lütfen{" "}
        <a
          href="/account/login?returnTo=/checkout"
          className="font-medium underline"
        >
          giriş yapın
        </a>
        .
      </div>
    );
  }

  const fullName = [me.firstName, me.lastName].filter(Boolean).join(" ").trim();
  const initials =
    (me.firstName?.[0] ?? me.email?.[0] ?? "?") + (me.lastName?.[0] ?? "");

  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border bg-white p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-sm font-semibold text-white">
        {initials.toUpperCase()}
      </div>
      <div className="leading-tight">
        <div className="text-sm font-medium">{fullName || "Kullanıcı"}</div>
        <div className="text-xs text-gray-600">{me.email}</div>
      </div>
    </div>
  );
}
