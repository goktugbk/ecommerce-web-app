"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ExpandableDescription({ text }: { text: string }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen((o) => !o)}
        className="mb-2 flex w-full items-center justify-between text-left text-sm font-medium"
      >
        <span>Ürün Açıklaması</span>
        {open ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>

      {open && (
        <div className="prose prose-sm max-w-none text-gray-700">
          <p className="whitespace-pre-line">{text}</p>
        </div>
      )}
    </div>
  );
}
