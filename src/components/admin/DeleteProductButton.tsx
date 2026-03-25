"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { withCsrf, ensureCsrfReady } from "@/lib/security/csrf-client";
import { Button } from "@/components/ui/Button";

export default function DeleteProductButton({ id, title }: { id: string; title?: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`"${title ?? "Bu ürün"}" silinsin mi?`)) return;

    await ensureCsrfReady();

    start(async () => {
      let res: Response | null = null;
      try {
        const headers = await withCsrf();
        res = await fetch(`/api/admin/products/${id}`, {
          method: "DELETE",
          headers,
        });

        if (!res.ok) {
          let msg = `Ürün silinemedi (${res.status})`;
          const ct = res.headers.get("content-type") || "";
          if (ct.includes("application/json")) {
            try {
              const j = await res.json();
              if (j?.error) msg = j.error;
              else if (j?.message) msg = j.message;
            } catch {}
          } else {
            try {
              const t = await res.text();
              if (t) msg = t.slice(0, 500);
            } catch {}
          }
          console.error("[DeleteProductButton] delete failed", msg, { status: res.status });
// Eğer ürün FK nedeniyle silinemiyorsa, kullanıcıya 'pasifleştirme' öner
if (res.status === 409 || /FK|kısıtı|kisit/i.test(msg)) {
  if (confirm("Ürün sipariş/sepet gibi kayıtlar tarafından kullanılıyor. Silinemiyor.\n\nBu ürünü P A S İ F L E Ş T İ R E Y İ M  mi?")) {
    try {
      const headers2 = await withCsrf();
      const res2 = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { ...headers2, "content-type": "application/json" },
        body: JSON.stringify({ op: "toggle-active" }),
      });
      if (!res2.ok) {
        let msg2 = `Pasifleştirme başarısız (${res2.status})`;
        const ct2 = res2.headers.get("content-type") || "";
        if (ct2.includes("application/json")) {
          try { const j2 = await res2.json(); if (j2?.error) msg2 = j2.error; } catch {}
        } else {
          try { const t2 = await res2.text(); if (t2) msg2 = t2.slice(0, 500); } catch {}
        }
        alert(msg2);
        return;
      }
      alert("Ürün pasifleştirildi.");
      router.refresh();
      return;
    } catch (e) {
      alert("Pasifleştirme sırasında bir hata oluştu.");
      return;
    }
  }
}
alert(msg);
return;

        }

        // başarı
        try {
          const j = await res.json();
          if (j?.softDeleted) {
            alert("Ürün sipariş/sepet referansı nedeniyle SİLİNEMEDİ, ancak PASİFLEŞTİRİLDİ.");
          }
        } catch {}

        router.refresh();
      } catch (err: any) {
        const status = (res && res.status) || "fetch-failed";
        console.error("[DeleteProductButton] network or unknown error", err, { status });
        alert("Ürün silinemedi. Ağ hatası veya beklenmeyen bir durum oluştu.");
      }
    });
  }

  return (
    <Button
      variant="destructive"
      onClick={handleDelete}
      disabled={pending}
      aria-busy={pending}
      title="Ürünü sil"
    >
      {pending ? "Siliniyor..." : "Sil"}
    </Button>
  );
}
