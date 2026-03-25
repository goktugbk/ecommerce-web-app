// src/components/checkout/StartCheckoutButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function StartCheckoutButton({
  className = "",
}: {
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function start() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/checkout-sessions", {
        method: "POST",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const text = await res.text().catch(() => "");
        console.error(
          "Non-JSON from /api/checkout-sessions:",
          res.status,
          text.slice(0, 200),
        );
        alert(
          "Endpoint JSON dönmüyor. Konumu: src/app/api/checkout-sessions/route.ts",
        );
        return;
      }
      const data = await res.json().catch(() => null);
      if (res.ok && data?.url) {
        router.push(data.url); // /checkout?id=...&step=info
      } else {
        alert(data?.message || "Checkout oturumu oluşturulamadı.");
      }
    } catch (e) {
      console.error(e);
      alert("Bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      className={className}
      onClick={start}
      disabled={loading}
    >
      {loading ? "Hazırlanıyor…" : "Checkout Oturumu Oluştur"}
    </Button>
  );
}
