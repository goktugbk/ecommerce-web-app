"use client";

import { MessageSquare } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export default function WriteReviewButton({
  productId,
  isLoggedIn,
}: {
  productId: string;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number | "">("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function handleClick() {
    if (!isLoggedIn) {
      // girişe yönlendir, dönüşte aynı sayfaya gelsin
      router.push(`/account?next=${encodeURIComponent(pathname || "/")}`);
      return;
    }
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: comment.trim(),
          rating: rating === "" ? undefined : Number(rating),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Yorum kaydedilemedi");
      }
      setOpen(false);
      setComment("");
      setRating("");
      // listeyi güncelle
      router.refresh();
    } catch (e: any) {
      setErr(e.message || "Yorum kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
        variant="outline"
        size="sm"
      >
        <MessageSquare className="h-4 w-4" />
        Yorum Yap
      </Button>

      {/* Basit modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-lg font-semibold">Yorum Yaz</h4>
              <Button
                onClick={() => setOpen(false)}
                className="rounded p-2 hover:bg-gray-100"
                aria-label="Kapat"
                variant="secondary"
              >
                ✕
              </Button>
            </div>

            <form onSubmit={submit} className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  className="w-full rounded-md border p-2"
                  value={rating}
                  onChange={(e) =>
                    setRating(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                >
                  <option value="">Puan (isteğe bağlı)</option>
                  {[5, 4, 3, 2, 1].map((r) => (
                    <option key={r} value={r}>
                      {r} / 5
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                className="w-full rounded-md border p-2"
                rows={4}
                placeholder="Yorumunuz…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
              />

              {err && <p className="text-sm text-red-600">{err}</p>}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border px-3 py-2 text-sm"
                  variant="outline"
                  size="sm"
                >
                  Vazgeç
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
                  variant="default"
                >
                  {saving ? "Gönderiliyor…" : "Gönder"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
