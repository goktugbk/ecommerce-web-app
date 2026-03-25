"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl p-6 text-center space-y-4">
      <h1 className="text-2xl font-semibold">Bir şeyler ters gitti</h1>
      <p className="text-gray-600">Üzgünüz, beklenmeyen bir hata oluştu.</p>
      <div className="flex items-center justify-center gap-3">
        <button onClick={() => reset()} className="rounded-lg px-4 py-2 border">Tekrar dene</button>
        <Link href="/" className="rounded-lg px-4 py-2 border">Ana sayfa</Link>
      </div>
      {process.env.NODE_ENV !== "production" && (
        <pre className="mt-4 max-h-64 overflow-auto rounded-lg bg-gray-100 p-3 text-left text-xs text-gray-700">
          {error?.message}
        </pre>
      )}
    </div>
  );
}
