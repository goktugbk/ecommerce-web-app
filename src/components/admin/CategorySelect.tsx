"use client";

import { withCsrf } from "@/lib/security/csrf-client";

import { useEffect, useState } from "react";

type Cat = { id: string; name: string };

export default function CategorySelect({
  productId,
  value,
  categories,
}: {
  productId: string;
  value: string; // "" = kategori yok
  categories: Cat[];
}) {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // controlled select için local state
  const [current, setCurrent] = useState<string>(value);

  // parent'tan gelen value değişirse senkronize et
  useEffect(() => {
    setCurrent(value);
  }, [value]);

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextVal = e.target.value;
    setCurrent(nextVal); // optimistic
    setSaving(true);
    setMsg(null);

    const categoryId = nextVal || null;

    try {
      const res = await fetch(`/api/admin/products/${productId}/category`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId }),
      });

      // JSON parse hatasına karşı güvenli
      const data = (await res.json().catch(() => ({}))) as
        | { ok: true }
        | { error?: string };

      if (!res.ok || "error" in data) {
        const text =
          "error" in data && data.error ? data.error : "İşlem başarısız.";
        setMsg(text);
      } else {
        setMsg("Kaydedildi");
      }
    } catch (err) {
      const text =
        err instanceof Error ? err.message : JSON.stringify(err, null, 2);
      setMsg(`Hata: ${text}`);
    } finally {
      setSaving(false);
      // 2 sn sonra mesajı sil
      setTimeout(() => setMsg(null), 2000);
    }
  }

  // Durum metni ve rengi
  const statusText = saving
    ? "Kaydediliyor…"
    : typeof msg === "string"
      ? msg
      : "";

  const statusClass = saving
    ? "text-gray-500"
    : typeof msg === "string"
      ? // küçük/büyük harf farkını önlemek için toLowerCase
        msg.toLowerCase().startsWith("hata") ||
        msg.toLowerCase().includes("başarısız")
        ? "text-red-600"
        : "text-green-600"
      : "text-gray-400";

  return (
    <div className="flex items-center gap-2">
      <select
        className="rounded border px-2 py-1 text-sm"
        value={current}
        onChange={onChange}
        disabled={saving}
      >
        <option value="">— Kategori yok —</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <span className={`text-xs ${statusClass}`}>{statusText}</span>
    </div>
  );
}
