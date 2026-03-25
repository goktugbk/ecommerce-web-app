// src/components/account/LogoutButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/Button";

export default function LogoutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  async function handleLogout() {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {}
    // Cookie server’da silindi; UI’yı güncelle
    router.replace("/account/login");
    router.refresh();
  }

  return (
    <Button
      onClick={() => start(handleLogout)}
      className="text-sm text-rose-600 hover:underline disabled:opacity-60"
      disabled={pending}
      variant="link"
    >
      Çıkış yap
    </Button>
  );
}
