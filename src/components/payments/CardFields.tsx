"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CreditCard, ShieldCheck } from "lucide-react";

type Brand = "visa" | "mastercard" | "amex" | "troy" | "unknown";

export type CardValues = {
  number: string; // digits only
  name: string;
  exp: string; // MM/YY
  cvc: string; // digits
  brand: Brand;
  valid: boolean;
};

export default function CardFields(props: {
  value?: Partial<CardValues>;
  onChange?: (v: CardValues) => void;
  disabled?: boolean;
  className?: string;
}) {
  const { value, onChange, disabled, className } = props;

  // ---- state
  const [digits, setDigits] = useState<string>(""); // numbers only
  const [name, setName] = useState<string>("");
  const [exp, setExp] = useState<string>(""); // MM/YY
  const [cvc, setCvc] = useState<string>("");

  const numberRef = useRef<HTMLInputElement>(null);
  const expRef = useRef<HTMLInputElement>(null);
  const cvcRef = useRef<HTMLInputElement>(null);

  // ---- helpers
  const onlyDigits = (s: string) => (s || "").replace(/\D+/g, "");

  function detectBrand(ds: string): Brand {
    // minimal ve hızlı tespit (BIN: ilk 6 haneye kadar)
    if (/^4/.test(ds)) return "visa";
    if (/^3[47]/.test(ds)) return "amex";
    // Troy TR (9792, 65xx Turkish domestic; resmi aralıklar çeşitlenebilir)
    if (/^(9792|65)/.test(ds)) return "troy";
    // Mastercard 51–55, 2221–2720
    if (
      /^(5[1-5])/.test(ds) ||
      /^(222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)/.test(ds)
    ) {
      return "mastercard";
    }
    if (ds.length >= 6) return "unknown";
    return "unknown";
  }

  function formatNumber(ds: string, brand: Brand) {
    // gösterim formatı
    if (brand === "amex") {
      // 4-6-5
      return ds.replace(/^(\d{0,4})(\d{0,6})(\d{0,5}).*$/, (_, a, b, c) =>
        [a, b, c].filter(Boolean).join(" "),
      );
    }
    // 4-4-4-4 (visa, mc, troy, unknown)
    return ds.replace(/(\d{1,4})/g, "$1 ").trim();
  }

  function luhnValid(ds: string) {
    // Luhn algoritması
    let sum = 0,
      dbl = false;
    for (let i = ds.length - 1; i >= 0; i--) {
      let n = ds.charCodeAt(i) - 48;
      if (dbl) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      dbl = !dbl;
    }
    return ds.length >= 12 && sum % 10 === 0;
  }

  function normalizedExp(input: string) {
    // Otomatik MM/YY formatı: 0–12 + / ekleme
    const d = input.replace(/[^\d]/g, "").slice(0, 4);
    if (d.length <= 2) return d;
    return `${d.slice(0, 2)}/${d.slice(2)}`;
  }

  function expValid(mmYY: string) {
    if (!/^\d{2}\/\d{2}$/.test(mmYY)) return false;
    const [mmStr, yyStr] = mmYY.split("/");
    const mm = Number(mmStr);
    if (mm < 1 || mm > 12) return false;

    // YY → 20YY (basit yaklaşım)
    const now = new Date();
    const yBase = 2000 + Number(yyStr);
    // son gün = ilgili ayın sonu
    const expDate = new Date(yBase, mm, 0, 23, 59, 59);
    // min: içinde bulunduğumuz ayı da kabul et
    return expDate >= new Date(now.getFullYear(), now.getMonth(), 1);
  }

  function cvcLenFor(brand: Brand) {
    return brand === "amex" ? 4 : 3;
  }

  const brand: Brand = useMemo(() => detectBrand(digits), [digits]);
  const formatted = useMemo(() => formatNumber(digits, brand), [digits, brand]);

  const numberOk = useMemo(() => {
    // uzunluk (kısa devre) + luhn
    const lenOk =
      brand === "amex"
        ? digits.length === 15
        : brand === "unknown"
          ? digits.length >= 12 && digits.length <= 19
          : digits.length === 16;
    return lenOk && luhnValid(digits);
  }, [digits, brand]);

  const expOk = useMemo(() => expValid(exp), [exp]);
  const cvcOk = useMemo(() => {
    const need = cvcLenFor(brand);
    return new RegExp(`^\\d{${need}}$`).test(cvc);
  }, [cvc, brand]);

  const valid = numberOk && expOk && cvcOk && name.trim().length >= 4;

  // dışarı bildirim
  useEffect(() => {
    onChange?.({
      number: digits,
      name,
      exp,
      cvc,
      brand,
      valid,
    });
  }, [digits, name, exp, cvc, brand, valid, onChange]);

  // controlled init
  useEffect(() => {
    if (!value) return;
    if (value.number) setDigits(onlyDigits(value.number));
    if (value.name !== undefined) setName(value.name);
    if (value.exp !== undefined) setExp(normalizedExp(value.exp));
    if (value.cvc) setCvc(onlyDigits(value.cvc));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- UI helpers
  const BrandBadge = () => {
    const map: Record<Brand, string> = {
      visa: "Visa",
      mastercard: "Mastercard",
      amex: "American Express",
      troy: "Troy",
      unknown: "Kart",
    };
    return (
      <span className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-gray-700">
        <CreditCard className="h-3.5 w-3.5" />
        {map[brand]}
      </span>
    );
  };

  return (
    <div className={`space-y-3 ${className || ""}`} aria-live="polite">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Kart Bilgileri</div>
        <BrandBadge />
      </div>

      {/* NUMARA */}
      <div className="relative">
        <input
          ref={numberRef}
          inputMode="numeric"
          autoComplete="cc-number"
          aria-label="Kart numarası"
          placeholder="XXXX XXXX XXXX XXXX"
          className={`w-full rounded-md border px-3 py-2 text-sm ${numberOk || digits.length === 0 ? "border-gray-300" : "border-red-500"}`}
          value={formatted}
          onChange={(e) => {
            const next = onlyDigits(e.target.value).slice(0, 19);
            setDigits(next);
            // 16 haneye geldiğinde otomatik tarih alanına geç
            const targetLen = brand === "amex" ? 15 : 16;
            if (next.length >= targetLen) expRef.current?.focus();
          }}
        />
        {!numberOk && digits.length > 0 && (
          <p className="mt-1 text-xs text-red-600">
            Kart numarasını kontrol edin.
          </p>
        )}
      </div>

      {/* İSİM */}
      <input
        autoComplete="cc-name"
        aria-label="Kart üzerindeki isim"
        placeholder="Ad SOYAD"
        className={`w-full rounded-md border px-3 py-2 text-sm ${name.trim().length >= 4 || name.length === 0 ? "border-gray-300" : "border-red-500"}`}
        value={name}
        onChange={(e) => setName(e.target.value.toUpperCase())}
        disabled={disabled}
      />

      <div className="grid grid-cols-3 gap-3">
        {/* SON KULLANMA */}
        <div>
          <input
            ref={expRef}
            inputMode="numeric"
            autoComplete="cc-exp"
            aria-label="Son kullanma tarihi"
            placeholder="AA/YY"
            className={`w-full rounded-md border px-3 py-2 text-sm ${expOk || exp.length === 0 ? "border-gray-300" : "border-red-500"}`}
            value={exp}
            onChange={(e) => {
              const next = normalizedExp(e.target.value);
              // otomatik 13+ ayları kapatmak için ilk hane 0-1
              const mm = next.replace(/[^\d]/g, "").slice(0, 2);
              if (mm.length === 1 && !/[0-1]/.test(mm)) return; // 2–9 reddet
              setExp(next);
              if (next.length === 5) cvcRef.current?.focus();
            }}
            maxLength={5}
            disabled={disabled}
          />
          {!expOk && exp.length > 0 && (
            <p className="mt-1 text-xs text-red-600">
              Geçerli bir tarih girin.
            </p>
          )}
        </div>

        {/* CVC */}
        <div>
          <input
            ref={cvcRef}
            inputMode="numeric"
            autoComplete="cc-csc"
            aria-label="Güvenlik kodu"
            placeholder={brand === "amex" ? "4 hane" : "3 hane"}
            className={`w-full rounded-md border px-3 py-2 text-sm ${cvcOk || cvc.length === 0 ? "border-gray-300" : "border-red-500"}`}
            value={cvc}
            onChange={(e) => {
              const need = cvcLenFor(brand);
              const next = onlyDigits(e.target.value).slice(0, need);
              setCvc(next);
            }}
            disabled={disabled}
          />
          {!cvcOk && cvc.length > 0 && (
            <p className="mt-1 text-xs text-red-600">
              CVC {brand === "amex" ? "4" : "3"} haneli olmalı.
            </p>
          )}
        </div>

        {/* Güvenlik ibaresi */}
        <div className="flex items-center rounded-md border px-3 text-xs text-gray-600">
          <ShieldCheck className="mr-2 h-4 w-4" />
          Bilgiler şifreli iletilir
        </div>
      </div>
    </div>
  );
}
