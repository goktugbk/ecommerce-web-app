// src/app/(site)/admin/hero/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import StableInput from "@/components/ui/StableInput";
import AdminBackLink from "@/components/admin/AdminBackLink";
import { ensureCsrfReady } from "@/lib/security/csrf-client";

type Slide = {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  mobileImageUrl?: string | null;
  buttons?: any;
  isActive: boolean;
  homeOrder?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type ApiOk = {
  ok: true;
  data: {
    items: Slide[];
    total: number;
    take: number;
    skip: number;
  };
};

export default function AdminHeroListPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [skip, setSkip] = useState(0);
  const [take] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    // CSRF cookie/token setup (varsa)
    ensureCsrfReady();
  }, []);

  async function load(s = skip) {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      params.set("take", String(take));
      params.set("skip", String(s));

      const res = await fetch(`/api/admin/hero?${params.toString()}`, { cache: "no-store" });

      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if ((body as any)?.error) msg = (body as any).error;
        } catch {}
        throw new Error(msg);
      }

      const body: ApiOk = await res.json();
      setItems(body.data.items);
      setTotal(body.data.total);
      setSkip(s);
    } catch (e: any) {
      setErr(`Slaytlar yüklenemedi: ${e?.message || "Bilinmeyen hata"}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleActive(id: string, nextActive: boolean) {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/hero/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });

      const body = await res.json().catch(() => ({} as any));
      if (!res.ok || !body?.ok) {
        throw new Error(body?.message || body?.error || `HTTP ${res.status}`);
      }

      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, isActive: nextActive } : x)));
    } catch (e: any) {
      setErr(`Güncelleme başarısız: ${e?.message || "Bilinmeyen hata"}`);
    } finally {
      setLoading(false);
    }
  }

  async function deleteSlide(id: string) {
    const yes = confirm("Bu slayt silinsin mi? Bu işlem geri alınamaz.");
    if (!yes) return;

    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/hero/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const body = await res.json().catch(() => ({} as any));
      if (!res.ok || !body?.ok) {
        throw new Error(body?.message || body?.error || `HTTP ${res.status}`);
      }

      setItems((prev) => prev.filter((x) => x.id !== id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e: any) {
      setErr(`Silme başarısız: ${e?.message || "Bilinmeyen hata"}`);
    } finally {
      setLoading(false);
    }
  }

  const colSpan = useMemo(() => 7, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Hero Slaytları</h1>

        <div className="flex items-center gap-2">
          <AdminBackLink />
          <Link href="/admin/hero/new">
            <Button>Yeni Slayt</Button>
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <StableInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ara: başlık / alt başlık"
            className="max-w-xs"
          />
          <Button onClick={() => load(0)} disabled={loading}>
            {loading ? "Yükleniyor…" : "Ara"}
          </Button>
        </div>

        {err && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive">
            {err}
          </div>
        )}

        <div className="rounded-xl border bg-white/60 p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left border-b">
              <tr>
                <th className="p-3">Sıra</th>
                <th className="p-3">Başlık</th>
                <th className="p-3">Durum</th>
                <th className="p-3">Dönem</th>
                <th className="p-3">Buton</th>
                <th className="p-3">Oluşturma</th>
                <th className="p-3 text-right">İşlemler</th>
              </tr>
            </thead>

            <tbody>
              {items.map((s, idx) => {
                const btnCount = Array.isArray(s.buttons) ? s.buttons.length : 0;
                const period =
                  (s.startsAt ? new Date(s.startsAt).toLocaleString("tr-TR") : "—") +
                  " → " +
                  (s.endsAt ? new Date(s.endsAt).toLocaleString("tr-TR") : "—");

                const orderText =
                  typeof s.homeOrder === "number" && !Number.isNaN(s.homeOrder)
                    ? String(s.homeOrder)
                    : String(idx + 1);

                return (
                  <tr key={s.id} className="border-b last:border-0 align-top">
                    <td className="p-3 whitespace-nowrap">{orderText}</td>

                    <td className="p-3">
                      <div className="font-medium">{s.title}</div>
                      {s.subtitle && <div className="text-xs text-gray-500">{s.subtitle}</div>}

                      <div className="mt-2 flex flex-wrap gap-2">
                        <a
                          href={s.imageUrl}
                          target="_blank"
                          className="text-xs underline underline-offset-2"
                          rel="noreferrer"
                        >
                          Görseli aç
                        </a>

                        {s.mobileImageUrl && (
                          <a
                            href={s.mobileImageUrl}
                            target="_blank"
                            className="text-xs underline underline-offset-2"
                            rel="noreferrer"
                          >
                            Mobil görsel
                          </a>
                        )}
                      </div>
                    </td>

                    <td className="p-3">
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${
                          s.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {s.isActive ? "Aktif" : "Pasif"}
                      </span>
                    </td>

                    <td className="p-3">{period}</td>
                    <td className="p-3">{btnCount > 0 ? `${btnCount} buton` : "—"}</td>
                    <td className="p-3 whitespace-nowrap">{new Date(s.createdAt).toLocaleString("tr-TR")}</td>

                    <td className="p-3 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => toggleActive(s.id, !s.isActive)}
                          disabled={loading}
                        >
                          {s.isActive ? "Gizle" : "Aktif yap"}
                        </Button>

                        <Button variant="secondary" onClick={() => deleteSlide(s.id)} disabled={loading}>
                          Sil
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!loading && items.length === 0 && (
                <tr>
                  <td className="p-6 text-center text-gray-500" colSpan={colSpan}>
                    Kayıt yok
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <div>Toplam: {total}</div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => load(Math.max(0, skip - take))}
              disabled={skip === 0 || loading}
            >
              Önceki
            </Button>
            <Button
              variant="secondary"
              onClick={() => load(skip + take)}
              disabled={skip + take >= total || loading}
            >
              Sonraki
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
