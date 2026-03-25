// src/app/(site)/admin/users/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import AdminBackLink from "@/components/admin/AdminBackLink";
import StableInput from "@/components/ui/StableInput";

type Role = "ADMIN" | "CUSTOMER";

type UserRow = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  role: Role;
  createdAt: string;
  updatedAt: string;
};

type ApiOk = {
  ok: true;
  data: {
    page: number;
    pageSize: number;
    pages: number;
    total: number;
    items: UserRow[];
  };
};

/** Basit TR telefon normalize/format */
function normalizeTR(phone?: string | null): { e164?: string; display?: string } {
  if (!phone) return {};
  let digits = phone.replace(/[^\d+]/g, "");

  // 00... -> +...
  if (digits.startsWith("00")) digits = "+" + digits.slice(2);

  // TR mobil desenlerini +90'a normalize et
  if (digits.startsWith("+90")) {
    // ok
  } else if (digits.startsWith("0") && digits.length === 11) {
    digits = "+90" + digits.slice(1);
  } else if (!digits.startsWith("+") && digits.startsWith("5") && digits.length === 10) {
    digits = "+90" + digits;
  }

  const e164 = digits.startsWith("+") ? digits : "+" + digits;
  const m = e164.match(/^\+90(\d{3})(\d{3})(\d{2})(\d{2})$/);
  const display = m ? `+90 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone;
  return { e164, display };
}

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function load(p = page) {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      params.set("page", String(p));
      params.set("pageSize", String(pageSize));

      const res = await fetch(`/api/admin/users?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body?.error) msg = body.error;
        } catch {}
        throw new Error(msg);
      }
      const body: ApiOk = await res.json();
      setItems(body.data.items);
      setPages(body.data.pages);
      setTotal(body.data.total);
      setPage(p);
    } catch (e: any) {
      setErr(`Kullanıcılar yüklenemedi: ${e?.message || "Bilinmeyen hata"}`);
    } finally {
      setLoading(false);
    }
  }

  async function updateRole(id: string, newRole: Role) {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, role: newRole }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      const body = await res.json();
      setItems((prev) => prev.map((u) => (u.id === id ? { ...u, role: body.user.role as Role } : u)));
    } catch (e: any) {
      alert(`Rol değiştirilemedi: ${e?.message || "Bilinmeyen hata"}`);
    } finally {
      setUpdatingId(null);
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      {/* başlık + admin’e dön */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <AdminBackLink />
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <StableInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ara: ad, soyad, e-posta, telefon…"
            className="max-w-xs"
          />
          <Button onClick={() => load(1)} disabled={loading}>
            Ara
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
                <th className="p-3">Ad Soyad</th>
                <th className="p-3">E-posta</th>
                <th className="p-3">Telefon</th>
                <th className="p-3">Rol</th>
                <th className="p-3">Oluşturma</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => {
                const phoneInfo = normalizeTR(u.phone);
                const phoneLabel = phoneInfo.display || u.phone || "—";
                const telHref = phoneInfo.e164 ? `tel:${phoneInfo.e164}` : undefined;
                return (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="p-3">
                      {[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">
                      {telHref ? (
                        <a href={telHref} className="underline underline-offset-2">
                          {phoneLabel}
                        </a>
                      ) : (
                        phoneLabel
                      )}
                    </td>
                    <td className="p-3">
                      <select
                        value={u.role}
                        onChange={(e) => updateRole(u.id, e.target.value as Role)}
                        className="rounded border p-1"
                        disabled={!!updatingId}
                      >
                        <option value="CUSTOMER">CUSTOMER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td className="p-3">{new Date(u.createdAt).toLocaleString("tr-TR")}</td>
                    <td className="p-3">
                      {u.phone && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            navigator.clipboard.writeText(phoneInfo.e164 || u.phone!)
                          }
                          aria-label="Telefonu Kopyala"
                          title="Telefonu Kopyala"
                          disabled={!!updatingId}
                        >
                          Kopyala
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loading && items.length === 0 && (
                <tr>
                  <td className="p-6 text-center text-gray-500" colSpan={6}>
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
              onClick={() => load(Math.max(1, page - 1))}
              disabled={page <= 1 || loading}
            >
              Önceki
            </Button>
            <Button
              variant="secondary"
              onClick={() => load(Math.min(pages, page + 1))}
              disabled={page >= pages || loading}
            >
              Sonraki
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
