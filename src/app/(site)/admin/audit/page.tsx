// src/app/(site)/admin/audit/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import StableInput from "@/components/ui/StableInput";

type Row = {
  id: string;
  adminId?: string | null;
  action?: string | null;
  entity?: string | null;
  entityId?: string | null;
  message?: string | null;
  meta?: string | null;
  path?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  createdAt: string;
};

type ApiOk = {
  ok: true;
  data: {
    page: number;
    pageSize: number;
    pages: number;
    total: number;
    items: Row[];
  };
};

export default function AdminAuditPage() {
  const [q, setQ] = useState("");
  const [adminId, setAdminId] = useState("");
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  async function load(p = page) {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (adminId) params.set("adminId", adminId);
      if (action) params.set("action", action);
      if (dateFrom) params.set("dateFrom", new Date(dateFrom).toISOString());
      if (dateTo) params.set("dateTo", new Date(dateTo).toISOString());
      params.set("page", String(p));
      params.set("pageSize", String(pageSize));
      const res = await fetch(`/api/admin/audit?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body?.error) msg = body.error;
        } catch {}
        throw new Error(msg);
      }
      const body: ApiOk = await res.json();
      setRows(body.data.items);
      setPages(body.data.pages);
      setTotal(body.data.total);
      setPage(p);
    } catch (e: any) {
      setErr(`Kayıtlar yüklenemedi: ${e?.message || "Bilinmeyen hata"}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
        <StableInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Serbest ara (action, entity, path, ip…)" />
        <StableInput value={adminId} onChange={(e) => setAdminId(e.target.value)} placeholder="Admin ID" />
        <StableInput value={action} onChange={(e) => setAction(e.target.value)} placeholder="Action" />
        <StableInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <StableInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        <Button onClick={() => load(1)} disabled={loading}>Filtrele</Button>
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
              <th className="p-3">Tarih</th>
              <th className="p-3">Admin</th>
              <th className="p-3">Action</th>
              <th className="p-3">Entity</th>
              <th className="p-3">Mesaj</th>
              <th className="p-3">IP</th>
              <th className="p-3">User Agent</th>
              <th className="p-3">ReqID</th>
              <th className="p-3">Path</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0 align-top">
                <td className="p-3 whitespace-nowrap">{new Date(r.createdAt).toLocaleString("tr-TR")}</td>
                <td className="p-3">{r.adminId || "—"}</td>
                <td className="p-3">{r.action || "—"}</td>
                <td className="p-3">
                  <div className="font-medium">{r.entity || "—"}</div>
                  {r.entityId && <div className="text-xs text-gray-500">{r.entityId}</div>}
                </td>
                <td className="p-3">
                  <div>{r.message || "—"}</div>
                  {r.meta && <pre className="mt-1 max-w-[28rem] overflow-x-auto whitespace-pre-wrap text-xs text-gray-600">{r.meta}</pre>}
                </td>
                <td className="p-3">{r.ip || "—"}</td>
                <td className="p-3 max-w-[20rem] truncate" title={r.userAgent || ""}>{r.userAgent || "—"}</td>
                <td className="p-3">{r.requestId || "—"}</td>
                <td className="p-3">{r.path || "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr><td className="p-6 text-center text-gray-500" colSpan={9}>Kayıt yok</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div>Toplam: {total}</div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => load(Math.max(1, page - 1))} disabled={page <= 1 || loading}>
            Önceki
          </Button>
          <Button variant="secondary" onClick={() => load(Math.min(pages, page + 1))} disabled={page >= pages || loading}>
            Sonraki
          </Button>
        </div>
      </div>
    </div>
  );
}
