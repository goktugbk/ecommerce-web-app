"use client";

import React, { useState, useTransition } from "react";
import { useInlineNewAddress } from "./InlineNewAddress";
import { Button } from "@/components/ui/Button";

type Draft = {
  firstName: string;
  lastName: string;
  line1: string;
  line2?: string;
  city: string;
  district: string;
  postal?: string;
  phone: string;
  label?: string; // (Ev, İş vb.)
};

export default function NewAddressForm() {
  const { hide } = useInlineNewAddress();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<Draft>({
    firstName: "",
    lastName: "",
    line1: "",
    line2: "",
    city: "",
    district: "",
    postal: "",
    phone: "",
    label: "",
  });
  const [error, setError] = useState<string | null>(null);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        // Burayı kendi API route’una göre güncelle:
        // Örn: POST /api/account/addresses
        const res = await fetch("/api/account/addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        const data = await res.json();
        if (!res.ok || data?.ok === false) {
          throw new Error(data?.message || "Adres kaydedilemedi.");
        }

        // Başarılı: formu kapat, sayfayı tazele
        hide();
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      } catch (err: any) {
        setError(err?.message || "Bir hata oluştu.");
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border bg-white/60 p-6 shadow-sm ring-1 ring-black/5"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Ad</label>
          <input
            name="firstName"
            value={form.firstName}
            onChange={onChange}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Soyad</label>
          <input
            name="lastName"
            value={form.lastName}
            onChange={onChange}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium">Adres Satırı 1</label>
          <input
            name="line1"
            value={form.line1}
            onChange={onChange}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="Mahalle, Cadde, No"
            required
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium">
            Adres Satırı 2 (opsiyonel)
          </label>
          <input
            name="line2"
            value={form.line2}
            onChange={onChange}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="Daire, Kat, Blok..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Şehir</label>
          <input
            name="city"
            value={form.city}
            onChange={onChange}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">İlçe</label>
          <input
            name="district"
            value={form.district}
            onChange={onChange}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Posta Kodu</label>
          <input
            name="postal"
            value={form.postal}
            onChange={onChange}
            className="mt-1 w-full rounded-xl border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Telefon</label>
          <input
            name="phone"
            value={form.phone}
            onChange={onChange}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="+90 5xx xxx xx xx"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            Etiket (Ev, İş...)
          </label>
          <input
            name="label"
            value={form.label}
            onChange={onChange}
            className="mt-1 w-full rounded-xl border px-3 py-2"
          />
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex gap-3">
        <Button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          variant="default"
        >
          {pending ? "Kaydediliyor..." : "Kaydet"}
        </Button>
        <Button
          type="button"
          onClick={hide}
          className="rounded-xl border px-4 py-2 text-sm font-medium"
          variant="outline"
        >
          Vazgeç
        </Button>
      </div>
    </form>
  );
}
