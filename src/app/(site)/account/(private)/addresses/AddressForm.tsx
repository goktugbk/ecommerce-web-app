"use client";

import React, { useMemo, useState } from "react";
import { TR_PROVINCES } from "@/data/tr-geo.generated";

/** Telefon: react-phone-number-input */
import "react-phone-number-input/style.css";
import PhoneInput from "react-phone-number-input";
import "./phone-input.css";
import { Button } from "@/components/ui/Button";

type Draft = {
  firstName: string;
  lastName: string;
  line1: string;
  line2: string;
  city: string;
  district: string;
  postal: string;
  /** Telefon alanları */
  fullPhone: string; // +905301234567 (E.164)
  countryIso2: string; // "TR", "US" vb.
  label: string;
};

export default function AddressForm({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState<Draft>({
    firstName: "",
    lastName: "",
    line1: "",
    line2: "",
    city: "",
    district: "",
    postal: "",
    fullPhone: "",
    countryIso2: "TR",
    label: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value ?? "" }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        firstName: (form.firstName ?? "").trim(),
        lastName: (form.lastName ?? "").trim(),
        line1: (form.line1 ?? "").trim(),
        line2: (form.line2 ?? "").trim(),
        city: (form.city ?? "").trim(),
        district: (form.district ?? "").trim(),
        postal: (form.postal ?? "").trim(),
        phone: (form.fullPhone ?? "").trim(), // E.164
        phoneCountry: (form.countryIso2 ?? "").trim(), // opsiyonel
        label: (form.label ?? "").trim(),
      };

      const res = await fetch("/api/account/addresses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json", // 👈 JSON isteğini belirtiyoruz
        },
        credentials: "include", // 👈 auth cookie gerekiyorsa
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      // Redirect veya HTML döndüyse ayırt et
      const ct = res.headers.get("content-type") || "";

      let data: any = null;
      if (ct.includes("application/json")) {
        data = await res.json();
      } else {
        // HTML/text fallback (örn. login sayfası / 404)
        const html = await res.text();
        throw new Error(
          res.status === 401
            ? "Oturum gerekli. Lütfen giriş yapın."
            : `Beklenmeyen yanıt (Content-Type: ${ct}, Status: ${res.status}).`,
        );
      }

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.message || "Adres kaydedilemedi.");
      }

      onSaved();
      if (typeof window !== "undefined") window.location.reload();
    } catch (err: any) {
      setError(err?.message || "Bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  const selectedCity = TR_PROVINCES.find((p) => p.name === (form.city ?? ""));

  /** İlçeleri normalize et: string/obj fark etmez, tekrarları kaldır, stabil key üret */
  const districts = useMemo(() => {
    const raw = (selectedCity?.districts ?? []) as Array<
      string | { name?: string; code?: string | number }
    >;
    const pairs = raw.map((d) => {
      const name = typeof d === "string" ? d : (d?.name ?? "");
      const code =
        typeof d === "string" ? name : d?.code != null ? String(d.code) : name;
      return { key: code, name };
    });
    const uniq = new Map<string, string>();
    for (const { key, name } of pairs) if (!uniq.has(key)) uniq.set(key, name);
    return Array.from(uniq.entries()).map(([key, name]) => ({ key, name }));
  }, [selectedCity]);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Ad Soyad */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Ad</label>
          <input
            name="firstName"
            value={form.firstName ?? ""}
            onChange={onChange}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Soyad</label>
          <input
            name="lastName"
            value={form.lastName ?? ""}
            onChange={onChange}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            required
          />
        </div>
      </div>

      {/* Adres satırları */}
      <div>
        <label className="block text-sm font-medium">Adres Satırı 1</label>
        <input
          name="line1"
          value={form.line1 ?? ""}
          onChange={onChange}
          className="mt-1 w-full rounded-xl border px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium">
          Adres Satırı 2 (opsiyonel)
        </label>
        <input
          name="line2"
          value={form.line2 ?? ""}
          onChange={onChange}
          className="mt-1 w-full rounded-xl border px-3 py-2"
        />
      </div>

      {/* Şehir & İlçe */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">İl</label>
          <select
            name="city"
            value={form.city ?? ""}
            onChange={(e) => {
              const v = e.target.value ?? "";
              setForm((s) => ({ ...s, city: v, district: "" }));
            }}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            required
          >
            <option value="">Seçiniz</option>
            {TR_PROVINCES.map((p) => (
              <option key={p.code ?? p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">İlçe</label>
          <select
            name="district"
            value={form.district ?? ""}
            onChange={onChange}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            required
            disabled={!selectedCity}
          >
            <option value="">Seçiniz</option>
            {districts.map(({ key, name }) => (
              <option key={key} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Posta kodu & Telefon */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Posta Kodu</label>
          <input
            name="postal"
            value={form.postal ?? ""}
            onChange={onChange}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            inputMode="numeric"
            pattern="\d*"
          />
        </div>

        {/* Telefon (ülke bayraklı, tüm ülkeler) */}
        {/* Telefon */}
        <div>
          <label className="block text-sm font-medium">Telefon</label>
          <div className="mt-1 rounded-xl border bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-black/10">
            <PhoneInput
              className="phone-input-reset"
              defaultCountry={form.countryIso2 || "TR"}
              value={form.fullPhone || ""}
              onChange={(val) =>
                setForm((s) => ({ ...s, fullPhone: val || "" }))
              }
              onCountryChange={(c) =>
                setForm((s) => ({
                  ...s,
                  countryIso2: c || s.countryIso2 || "TR",
                }))
              }
              international
              countryCallingCodeEditable={false}
              name="phone" // ✅ doğrudan ver
              required // ✅ doğrudan ver
            />
          </div>
        </div>
      </div>

      {/* Etiket */}
      <div>
        <label className="block text-sm font-medium">Etiket</label>
        <input
          name="label"
          value={form.label ?? ""}
          onChange={onChange}
          className="mt-1 w-full rounded-xl border px-3 py-2"
          placeholder="Ev, İş..."
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          variant="default"
        >
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </div>
    </form>
  );
}
