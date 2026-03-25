"use client";

import React, { useLayoutEffect, useRef } from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
};

/**
 * StableInput:
 * - Değer değişimlerinde DOM yeniden kurulumundan kaynaklı odak (focus) kaybını telafi eder.
 * - Input daha önce odaktaysa, render sonrası tekrar fokuslar ve caret pozisyonunu korur.
 */
export default function StableInput({ className, ...props }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const wasFocused = useRef(false);
  const lastSelStart = useRef<number | null>(null);
  const lastSelEnd = useRef<number | null>(null);

  // Kullanıcı yazarken odakta olduğunu ve caret'i hatırla
  function rememberSelection() {
    const el = ref.current;
    if (!el) return;
    wasFocused.current = document.activeElement === el;
    try {
      lastSelStart.current = el.selectionStart ?? null;
      lastSelEnd.current = el.selectionEnd ?? null;
    } catch {
      lastSelStart.current = lastSelEnd.current = null;
    }
  }

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Değer güncellendikten SONRA, input daha önce odaktaysa tekrar fokusla
    if (wasFocused.current) {
      // Yeniden yerleşme tamamlanınca çalışsın
      queueMicrotask(() => {
        try {
          el.focus({ preventScroll: true });
          if (
            typeof lastSelStart.current === "number" &&
            typeof lastSelEnd.current === "number" &&
            el.setSelectionRange
          ) {
            el.setSelectionRange(lastSelStart.current, lastSelEnd.current);
          } else if (el.setSelectionRange) {
            const len = el.value.length;
            el.setSelectionRange(len, len);
          }
        } catch {
          /* ignore */
        }
      });
    }
  });

  return (
    <input
      ref={ref}
      {...props}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.preventDefault();
        rememberSelection();
        props.onKeyDown?.(e);
      }}
      onKeyUp={(e) => {
        rememberSelection();
        props.onKeyUp?.(e);
      }}
      onClick={(e) => {
        rememberSelection();
        props.onClick?.(e);
      }}
      onChange={(e) => {
        rememberSelection();
        props.onChange(e);
      }}
      className={`w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10 ${className ?? ""}`}
    />
  );
}
