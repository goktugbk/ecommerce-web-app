// src/app/(site)/admin/hero/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import StableInput from "@/components/ui/StableInput";
import AdminBackLink from "@/components/admin/AdminBackLink";

type ButtonDef = { label: string; href: string; variant?: "primary" | "secondary" | "ghost" };

export default function NewHeroSlidePage() {
  const r = useRouter();

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");

  const [imageUrl, setImageUrl] = useState("");
  const [mobileImageUrl, setMobileImageUrl] = useState("");

  const [homeOrder, setHomeOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);
  const [startsAt, setStartsAt] = useState<string>("");
  const [endsAt, setEndsAt] = useState<string>("");

  const [buttonsJson, setButtonsJson] = useState<string>(
    JSON.stringify([{ label: "Alışverişe Başla", href: "/products", variant: "primary" } as ButtonDef], null, 2),
  );

  const [loading, setLoading] = useState(false);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const [err, setErr] = useState<string | null>(null);

async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/admin/upload", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  const text = await res.text();

  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {}

  if (!res.ok) {
    if (text?.trim().startsWith("<")) {
      throw new Error("Upload API HTML döndürüyor (login/redirect/404 olabilir).");
    }
    throw new Error(body?.error || body?.message || `Upload HTTP ${res.status}`);
  }

  // ✅ senin endpoint: { ok:true, files:[{ url: "..." }] }
  const url =
    body?.files?.[0]?.url ||
    body?.url ||
    body?.data?.url ||
    body?.fileUrl ||
    body?.result?.url;

  if (!url) {
    throw new Error(`Upload başarılı ama URL alanı bulunamadı. Response: ${text}`);
  }

  return url as string;
}


  async function handleMainImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErr(null);
    setUploadingMain(true);
    try {
      const url = await uploadFile(file);
      setImageUrl(url);
    } catch (e: any) {
      setErr(e?.message || "Görsel yüklenemedi");
    } finally {
      setUploadingMain(false);
      // aynı dosyayı tekrar seçebilmek için
      e.target.value = "";
    }
  }

  async function handleMobileImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErr(null);
    setUploadingMobile(true);
    try {
      const url = await uploadFile(file);
      setMobileImageUrl(url);
    } catch (e: any) {
      setErr(e?.message || "Mobil görsel yüklenemedi");
    } finally {
      setUploadingMobile(false);
      e.target.value = "";
    }
  }

  async function handleCreate() {
    setLoading(true);
    setErr(null);

    try {
      let buttons: ButtonDef[] = [];
      try {
        const parsed = JSON.parse(buttonsJson);
        if (!Array.isArray(parsed)) throw new Error("Butonlar JSON bir dizi olmalı.");
        buttons = parsed as ButtonDef[];
      } catch (e: any) {
        throw new Error(`Butonlar JSON hatalı: ${e?.message || "ParseError"}`);
      }

      const payload = {
        title: title.trim(),
        subtitle: subtitle.trim() ? subtitle.trim() : undefined,
        imageUrl: imageUrl.trim(),
        mobileImageUrl: mobileImageUrl.trim() ? mobileImageUrl.trim() : undefined,
        buttons,
        isActive,
        homeOrder: homeOrder > 0 ? homeOrder : undefined,
        startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
        endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
      };

      const res = await fetch("/api/admin/hero", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let body: any = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {}

      if (!res.ok || !body?.ok) {
        if (text?.trim().startsWith("<")) {
          throw new Error("API JSON yerine HTML döndürüyor (login/redirect/404 olabilir).");
        }
        throw new Error(body?.message || body?.error || `HTTP ${res.status}`);
      }

      r.push("/admin/hero");
    } catch (e: any) {
      setErr(e?.message || "CreateFailed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Yeni Hero Slayt</h1>
        <AdminBackLink />
      </div>

      {err && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive">
          {err}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        <label className="space-y-1">
          <div className="text-sm font-medium">Başlık</div>
          <StableInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn. Sonbahar Koleksiyonu" />
        </label>

        <label className="space-y-1">
          <div className="text-sm font-medium">Alt Başlık</div>
          <StableInput value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Kısa açıklama (opsiyonel)" />
        </label>

        {/* MAIN IMAGE */}
        <div className="space-y-2 rounded-lg border p-3">
          <div className="text-sm font-medium">Görsel</div>

          <label className="space-y-1 block">
            <div className="text-xs text-gray-500">Görsel URL (istersen)</div>
            <StableInput value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://... veya /uploads/..." />
          </label>

          <label className="space-y-1 block">
            <div className="text-xs text-gray-500">Bilgisayardan yükle</div>
            <input
              type="file"
              accept="image/*"
              onChange={handleMainImagePick}
              disabled={uploadingMain}
              className="block w-full text-sm"
            />
            {uploadingMain && <div className="text-xs text-gray-500">Yükleniyor…</div>}
          </label>

          {imageUrl && (
            <div className="pt-2">
              <div className="text-xs text-gray-500 mb-1">Önizleme</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="preview" className="max-h-40 rounded-md border object-contain bg-white" />
            </div>
          )}
        </div>

        {/* MOBILE IMAGE */}
        <div className="space-y-2 rounded-lg border p-3">
          <div className="text-sm font-medium">Mobil Görsel (opsiyonel)</div>

          <label className="space-y-1 block">
            <div className="text-xs text-gray-500">Mobil Görsel URL (istersen)</div>
            <StableInput value={mobileImageUrl} onChange={(e) => setMobileImageUrl(e.target.value)} placeholder="https://... veya /uploads/..." />
          </label>

          <label className="space-y-1 block">
            <div className="text-xs text-gray-500">Bilgisayardan yükle</div>
            <input
              type="file"
              accept="image/*"
              onChange={handleMobileImagePick}
              disabled={uploadingMobile}
              className="block w-full text-sm"
            />
            {uploadingMobile && <div className="text-xs text-gray-500">Yükleniyor…</div>}
          </label>

          {mobileImageUrl && (
            <div className="pt-2">
              <div className="text-xs text-gray-500 mb-1">Önizleme</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mobileImageUrl} alt="mobile preview" className="max-h-40 rounded-md border object-contain bg-white" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1">
            <div className="text-sm font-medium">Sıra (homeOrder)</div>
            <StableInput
              type="number"
              value={homeOrder}
              onChange={(e) => setHomeOrder(Number(e.target.value || 0))}
              min={0}
            />
          </label>

          <label className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4"
            />
            <span>Aktif</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1">
            <div className="text-sm font-medium">Başlangıç (ops.)</div>
            <StableInput type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </label>

          <label className="space-y-1">
            <div className="text-sm font-medium">Bitiş (ops.)</div>
            <StableInput type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </label>
        </div>

        <label className="space-y-1">
          <div className="text-sm font-medium">Butonlar (JSON dizi)</div>
          <textarea
            value={buttonsJson}
            onChange={(e) => setButtonsJson(e.target.value)}
            className="w-full min-h-[140px] rounded-md border p-2 font-mono text-sm"
            spellCheck={false}
          />
        </label>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => history.back()} disabled={loading || uploadingMain || uploadingMobile}>
            Vazgeç
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading || uploadingMain || uploadingMobile || !title.trim() || !imageUrl.trim()}
          >
            {loading ? "Kaydediliyor…" : "Oluştur"}
          </Button>
        </div>
      </div>
    </div>
  );
}
