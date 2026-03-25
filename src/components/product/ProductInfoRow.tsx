"use client";

import { MessageSquareText, Ruler, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

type Box = {
  icon: React.ReactNode;
  title: string;
  content: React.ReactNode; // modal içeriği
};

export default function ProductInfoRow() {
  const [open, setOpen] = useState<null | "sss" | "beden" | "iade">(null);

  const boxes: Record<string, Box> = {
    sss: {
      icon: <MessageSquareText className="h-10 w-10" />,
      title: "Sıkça Sorulan Sorular",
      content: (
        <ul className="list-disc space-y-2 pl-5 text-sm leading-6">
          <li>Kargo süresi: 1-3 iş günü.</li>
          <li>El yapımı ürünlerde ufak renk farkları olabilir.</li>
          <li>Bakım: Nemli bezle siliniz, makinede yıkamayınız.</li>
        </ul>
      ),
    },
    beden: {
      icon: <Ruler className="h-10 w-10" />,
      title: "Beden Tablosu",
      content: (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="py-1 pr-4">Beden</th>
              <th className="py-1 pr-4">En (cm)</th>
              <th className="py-1">Boy (cm)</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["S", "48", "68"],
              ["M", "51", "70"],
              ["L", "54", "72"],
              ["XL", "57", "74"],
            ].map((r) => (
              <tr key={r[0]}>
                <td className="py-1 pr-4">{r[0]}</td>
                <td className="py-1 pr-4">{r[1]}</td>
                <td className="py-1">{r[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ),
    },
    iade: {
      icon: <RefreshCw className="h-10 w-10" />,
      title: "İade ve Değişim",
      content: (
        <div className="space-y-2 text-sm leading-6">
          <p>
            Ürün elinize ulaştıktan sonra <b>14 gün</b> içinde koşulsuz iade
            edebilirsiniz.
          </p>
          <p>
            Değişim için müşteri hizmetleri ile iletişime geçin:{" "}
            <a href="mailto:destek@site.com" className="underline">
              destek@site.com
            </a>
          </p>
        </div>
      ),
    },
  };

  return (
    <>
      {/* kutular */}
      <div className="grid gap-6 rounded-2xl border bg-white p-6 md:grid-cols-3">
        {(Object.keys(boxes) as Array<keyof typeof boxes>).map((key) => {
          const b = boxes[key];
          return (
            <Button
              key={key}
              type="button"
              onClick={() => setOpen(key)}
              className="flex flex-col items-center gap-3 rounded-xl border p-5 text-center transition hover:shadow-sm"
              variant="outline"
            >
              {b.icon}
              <span className="text-sm font-medium">{b.title}</span>
            </Button>
          );
        })}
      </div>

      {/* basit modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
          onClick={() => setOpen(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-base font-semibold">{boxes[open].title}</h4>
              <Button
                className="rounded px-2 py-1 text-sm hover:bg-gray-100"
                onClick={() => setOpen(null)}
                variant="secondary"
                size="sm"
              >
                Kapat
              </Button>
            </div>
            {boxes[open].content}
          </div>
        </div>
      )}
    </>
  );
}
