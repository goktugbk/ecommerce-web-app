"use client";

import React, { useEffect, useMemo, useRef, useState, useActionState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import LayoutShell from "@/components/ui/LayoutShell";
import StableInput from "@/components/ui/StableInput";
import { proceedToShippingAction, placeOrder } from "@/app/(checkout)/checkout/actions";
import { TR_PROVINCES } from "@/data/tr-geo.generated";
import CardFields, { type CardValues } from "@/components/payments/CardFields";

type Shipping = { id: string; name: string; fee: number };
type Payment = { id: string; name: string };
type Item = { id: string; title: string; price: number; quantity: number; currency: string };

type Identity = Partial<{
  firstName: string;
  lastName: string;
  phone: string; // +90 5xx xxx xx xx, 05xxxxxxxxxx, 5xxxxxxxxx vb.
}>;

type AddressDraft = {
  firstName: string;
  lastName: string;
  line1: string;
  line2?: string;
  city: string;
  district: string;
  postal?: string;
  phone: string; // görüntü: +90 5xx xxx xx xx
  saveForNext: boolean;
};

/* ----------------- Telefon yardımcıları ----------------- */
const onlyDigits = (s: string) => s.replace(/\D+/g, "");
function toDigitsFromValue(v: string) {
  let d = onlyDigits(v || "");
  if (d.startsWith("90")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 10);
}
function formatFromDigits(d: string) {
  const dd = (d || "").slice(0, 10);
  const p: string[] = ["+90"];
  if (dd.length > 0) p.push(" ", dd.slice(0, 3));
  if (dd.length > 3) p.push(" ", dd.slice(3, 6));
  if (dd.length > 6) p.push(" ", dd.slice(6, 8));
  if (dd.length > 8) p.push(" ", dd.slice(8, 10));
  return p.join("");
}
function isValidDigits(d: string) {
  return /^\d{10}$/.test(d) && d[0] === "5";
}
/* ----------------- İl yardımcıları ----------------- */
function findProvinceIdByName(name?: string | null) {
  const n = (name || "").trim().toLowerCase();
  if (!n) return "";
  const hit = TR_PROVINCES.find((p) => p.name.trim().toLowerCase() === n);
  return hit?.id ?? "";
}
/* -------------------------------------------------------- */

export default function CheckoutForm({
  items,
  subtotal,
  shippings,
  payments,
  sessionId,
  defaultIdentity,
  allowIdentityEdit = true,
  step: stepProp = "info",
  initialAddr,
  /* ✅ yeni: kayıtlı adresler */
  savedAddresses = [],
}: {
  items: Item[];
  subtotal: number;
  shippings: Shipping[];
  payments: Payment[];
  sessionId?: string;
  defaultIdentity?: Identity;
  allowIdentityEdit?: boolean;
  step?: "info" | "shipping" | "payment" | "review";
  initialAddr?: Partial<AddressDraft> | null;
  savedAddresses?: Array<{
    id: string;
    line1: string;
    line2: string | null;
    city: string;
    district: string; // db'de state
    postal: string | null;
    country: string | null;
    isDefault: boolean;
    createdAt?: string; // client props için serialize edilmiş ISO string önerilir
  }>;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  // ---------- STATE ----------
  const [addr, setAddr] = useState<AddressDraft>({
    firstName: "",
    lastName: "",
    line1: "",
    line2: "",
    city: "",
    district: "",
    postal: "",
    phone: "+90 ",
    saveForNext: true,
  });

  // telefon: yalın 10-hane ve ref
  const [phoneDigits, setPhoneDigits] = useState<string>("");
  const phoneRef = useRef<HTMLInputElement>(null);

  // initial step (server'dan geldi)
  const initialStepFromProp: 1 | 2 | 3 =
    stepProp === "payment" ? 3 : stepProp === "shipping" ? 2 : 1;
  const [step, setStep] = useState<1 | 2 | 3>(initialStepFromProp);

  // ✅ seçili kayıtlı adres
  const [selectedSavedAddrId, setSelectedSavedAddrId] = useState<string>("");

  // ✅ form ve hidden input referansları (Kullan ile anında submit)
  const formRef = useRef<HTMLFormElement>(null);
  const savedAddrIdRef = useRef<HTMLInputElement>(null);

  // URL senkron (UX için)
  useEffect(() => {
    const q = step === 1 ? "info" : step === 2 ? "shipping" : "payment";
    const params = new URLSearchParams(sp.toString());
    params.set("step", q);
    router.replace(`?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Mount'ta URL'den adımı geri yükle
  useEffect(() => {
    const s = sp.get("step");
    if (s === "shipping") setStep(2);
    else if (s === "payment") setStep(3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // initialAddr (cookie) + defaultIdentity (me) ile prefill
  useEffect(() => {
    const merged: AddressDraft = {
      firstName: initialAddr?.firstName ?? defaultIdentity?.firstName ?? "",
      lastName: initialAddr?.lastName ?? defaultIdentity?.lastName ?? "",
      line1: initialAddr?.line1 ?? "",
      line2: initialAddr?.line2 ?? "",
      city: initialAddr?.city ?? "",
      district: initialAddr?.district ?? "",
      postal: initialAddr?.postal ?? "",
      phone:
        initialAddr?.phone ??
        (defaultIdentity?.phone
          ? formatFromDigits(toDigitsFromValue(defaultIdentity.phone))
          : "+90 "),
      saveForNext: initialAddr?.saveForNext ?? true,
    };
    setAddr(merged);
    setPhoneDigits(toDigitsFromValue(merged.phone));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialAddr), defaultIdentity?.firstName, defaultIdentity?.lastName, defaultIdentity?.phone]);

  const [provinceId, setProvinceId] = useState<string>("");
  const districts = useMemo(
    () => TR_PROVINCES.find((p) => p.id === provinceId)?.districts ?? [],
    [provinceId],
  );

  const [shippingId, setShippingId] = useState(shippings[0]?.id ?? "");
  const [paymentId, setPaymentId] = useState(payments[0]?.id ?? "");

  // Kart alanları
  const [card, setCard] = useState<CardValues>({
    number: "",
    name: "",
    exp: "",
    cvc: "",
    brand: "unknown",
    valid: false,
  });

  // UI
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const currency = items[0]?.currency ?? "TRY";

  const addressValid = useMemo(
    () =>
      addr.firstName.trim() &&
      addr.lastName.trim() &&
      addr.line1.trim() &&
      (addr.city.trim() || provinceId) &&
      addr.district.trim() &&
      isValidDigits(phoneDigits),
    [addr, phoneDigits, provinceId],
  );

  const selectedShipping = useMemo(
    () => shippings.find((s) => s.id === shippingId) ?? shippings[0],
    [shippings, shippingId],
  );

  const grandTotal = useMemo(
    () => subtotal + (selectedShipping?.fee ?? 0),
    [subtotal, selectedShipping],
  );

  const selectedPayment = useMemo(() => payments.find((p) => p.id === paymentId), [payments, paymentId]);

  const isCardPayment = useMemo(() => {
    const id = (selectedPayment?.id || "").toLowerCase();
    const nm = (selectedPayment?.name || "").toLowerCase();
    return (
      id === "pay-cc" ||
      id === "cc" ||
      id.includes("card") ||
      id.includes("credit") ||
      id.includes("stripe") ||
      id.includes("iyzico") ||
      nm.includes("card") ||
      nm.includes("credit") ||
      nm.includes("kredi")
    );
  }, [selectedPayment]);

  const cardOk = useMemo(() => !isCardPayment || card.valid, [isCardPayment, card.valid]);

  const hasShipping = Boolean(shippingId);
  const hasPayment = Boolean(paymentId);
  const hasSession = Boolean(sessionId && sessionId.trim().length > 0);

  // React 19: useActionState
  const [actionState, formAction, actionPending] = useActionState(proceedToShippingAction as any, null);

  // Adres server action tamamlandığında 2. adıma geç
  useEffect(() => {
    if (actionState && (actionState as any).ok) {
      setStep(2);
    }
  }, [actionState]);

  // ✅ Kayıtlı adresi forma uygula
  function applySavedAddress(id: string) {
    const a = savedAddresses.find((x) => x.id === id);
    if (!a) return;

    // isim/telefon kullanıcı kimliğinden (addr'de zaten mevcut),
    // adres alanlarını kaydedilmişten alıyoruz
    setAddr((s) => ({
      ...s,
      line1: a.line1,
      line2: a.line2 ?? "",
      city: a.city,
      district: a.district,
      postal: a.postal ?? "",
      // first/last/phone korunur
    }));

    // il id'sini, şehir adına göre set et
    const provId = findProvinceIdByName(a.city);
    setProvinceId(provId);
  }

  // ---- Siparişi Tamamla: Server Action çağır ----
  async function submitOrder() {
    if (pending) return;
    if (!hasSession) {
      setErr("Oturum bulunamadı. Lütfen sayfayı yeniden açın.");
      return;
    }
    if (!addressValid) {
      setErr("Adres bilgilerini eksiksiz ve geçerli telefonla doldurun.");
      return;
    }
    if (!hasShipping) {
      setErr("Kargo yöntemi seçin.");
      return;
    }
    if (!hasPayment) {
      setErr("Ödeme yöntemi seçin.");
      return;
    }
    if (!cardOk) {
      setErr("Kart bilgilerini eksiksiz doldurun.");
      return;
    }

    setPending(true);
    setErr(null);
    setOk(null);
    try {
      const res = await placeOrder({
        addr: { ...addr, phone: formatFromDigits(phoneDigits) },
        shippingId,
        paymentId,
      });

      if (res.ok) {
        window.location.href = res.redirectUrl || `/order/${res.orderId}`;
      } else {
        setErr(res.message || "Sipariş oluşturulamadı.");
      }
    } catch (e: any) {
      setErr(e?.message || "Bir hata oluştu.");
    } finally {
      setPending(false);
    }
  }

  const anyNationalDigits = phoneDigits.length > 0;

  function Label({ children }: { children: React.ReactNode }) {
    return <label className="mb-1 block text-sm font-medium">{children}</label>;
  }
  function StepHeader({
    n,
    title,
    done,
    active,
    onEdit,
  }: {
    n: 1 | 2 | 3;
    title: string;
    done: boolean;
    active: boolean;
    onEdit?: () => void;
  }) {
    return (
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full border text-sm font-semibold
              ${active ? "border-black text-black" : "border-gray-300 text-gray-400"}`}
          >
            {done ? <Check className="h-4 w-4" /> : n}
          </div>
          <div className="text-lg font-semibold">{title}</div>
        </div>
        {done && !active && onEdit && (
          <button type="button" onClick={onEdit} className="text-sm underline underline-offset-4 hover:opacity-80">
            Düzenle
          </button>
        )}
      </div>
    );
  }

  return (
    <LayoutShell title="Checkout">
      <section className="mx-auto max-w-5xl space-y-8">
        {/* STEP 1: ADRES */}
        <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
          <StepHeader n={1} title="Adres" active={step === 1} done={!!addressValid && step > 1} onEdit={() => setStep(1)} />

          {step === 1 ? (
            <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* server action için gerekli alanlar */}
              <input type="hidden" name="sessionId" value={sessionId ?? ""} />
              <input type="hidden" name="firstName" value={addr.firstName} />
              <input type="hidden" name="lastName" value={addr.lastName} />
              <input type="hidden" name="line1" value={addr.line1} />
              <input type="hidden" name="line2" value={addr.line2 ?? ""} />
              <input type="hidden" name="city" value={addr.city} />
              <input type="hidden" name="district" value={addr.district} />
              <input type="hidden" name="postal" value={addr.postal ?? ""} />
              <input type="hidden" name="phone" value={formatFromDigits(phoneDigits)} />
              {/* EMAIL ALANI KALDIRILDI */}
              <input type="hidden" name="saveForNext" value={addr.saveForNext ? "1" : ""} />

              {/* ✅ yeni: seçilmiş kayıtlı adres id'si */}
              <input ref={savedAddrIdRef} type="hidden" name="savedAddressId" value={selectedSavedAddrId} />

              {/* ✅ Kayıtlı Adresler Bloğu (formun içinde) */}
              {savedAddresses.length > 0 && (
                <div className="sm:col-span-2 mb-2 rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="mb-2 text-sm font-medium">Kayıtlı Adreslerim</div>
                  <div className="space-y-2">
                    {savedAddresses.map((a) => (
                      <label
                        key={a.id}
                        className="flex items-start justify-between gap-3 rounded-lg border bg-white px-3 py-2"
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="savedAddrRadio"
                            checked={selectedSavedAddrId === a.id}
                            onChange={() => {
                              setSelectedSavedAddrId(a.id);
                              // form alanlarını da dolduralım ki kullanıcı isterse düzenleyebilsin:
                              setAddr((s) => ({
                                ...s,
                                line1: a.line1,
                                line2: a.line2 ?? "",
                                city: a.city,
                                district: a.district,
                                postal: a.postal ?? "",
                              }));
                              // il id'si
                              const provId = findProvinceIdByName(a.city);
                              setProvinceId(provId);
                              // hidden input'u anında güncelle
                              if (savedAddrIdRef.current) savedAddrIdRef.current.value = a.id;
                            }}
                          />
                          <div className="text-sm">
                            <div className="font-medium">
                              {a.city} / {a.district}{" "}
                              {a.isDefault ? (
                                <span className="ml-2 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider">
                                  Varsayılan
                                </span>
                              ) : null}
                            </div>
                            <div className="text-gray-600">
                              {a.line1}
                              {a.line2 ? `, ${a.line2}` : ""}
                              {a.postal ? ` • ${a.postal}` : ""}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="rounded-md border px-3 py-1.5 text-xs font-medium"
                          title="Bu adresle kargoya geç"
                          onClick={() => {
                            // seçili değilse seç:
                            if (selectedSavedAddrId !== a.id) setSelectedSavedAddrId(a.id);
                            // hidden input'u garanti güncelle:
                            if (savedAddrIdRef.current) savedAddrIdRef.current.value = a.id;
                            // form submit -> server action cookie'yi doldursun
                            formRef.current?.requestSubmit();
                          }}
                        >
                          Kullan
                        </button>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label>Ad</Label>
                <StableInput
                  autoComplete="given-name"
                  value={addr.firstName}
                  onChange={(e) => setAddr((s) => ({ ...s, firstName: e.target.value }))}
                  placeholder="Ad"
                  disabled={!allowIdentityEdit}
                />
              </div>
              <div>
                <Label>Soyad</Label>
                <StableInput
                  autoComplete="family-name"
                  value={addr.lastName}
                  onChange={(e) => setAddr((s) => ({ ...s, lastName: e.target.value }))}
                  placeholder="Soyad"
                  disabled={!allowIdentityEdit}
                />
              </div>

              <div className="sm:col-span-2">
                <Label>Adres</Label>
                <StableInput
                  autoComplete="address-line1"
                  value={addr.line1}
                  onChange={(e) => setAddr((s) => ({ ...s, line1: e.target.value }))}
                  placeholder="Apartman, daire, vb."
                />
              </div>

              <div>
                <Label>İl</Label>
                <select
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  value={provinceId}
                  onChange={(e) => {
                    const v = e.target.value;
                    setProvinceId(v);
                    const prov = TR_PROVINCES.find((x) => x.id === v);
                    setAddr((s) => ({ ...s, city: prov?.name ?? "", district: "" }));
                  }}
                >
                  <option value="">İl seçin</option>
                  {TR_PROVINCES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>İlçe</Label>
                <select
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  value={addr.district}
                  onChange={(e) => setAddr((s) => ({ ...s, district: e.target.value }))}
                  disabled={!provinceId}
                >
                  <option value="">{provinceId ? "İlçe seçin" : "Önce il seçin"}</option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Posta Kodu</Label>
                <StableInput
                  autoComplete="postal-code"
                  inputMode="numeric"
                  value={addr.postal ?? ""}
                  onChange={(e) => setAddr((s) => ({ ...s, postal: e.target.value }))}
                  placeholder="34000"
                />
              </div>

              {/* 📱 Telefon */}
              <div>
                <Label>Telefon</Label>
                <input
                  ref={phoneRef}
                  autoComplete="tel"
                  inputMode="tel"
                  maxLength={17}
                  value={formatFromDigits(phoneDigits)}
                  onFocus={(e) => {
                    requestAnimationFrame(() => {
                      const end = e.currentTarget.value.length;
                      e.currentTarget.setSelectionRange(end, end);
                    });
                  }}
                  onKeyDown={(e) => {
                    const input = e.currentTarget;
                    const caret = input.selectionStart ?? 0;
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      return;
                    }
                    if (e.key === "Tab" && !isValidDigits(phoneDigits)) {
                      e.preventDefault();
                      requestAnimationFrame(() => {
                        input.focus();
                        const end = input.value.length;
                        input.setSelectionRange(end, end);
                      });
                      return;
                    }
                    if ((e.key === "Backspace" || e.key === "Delete") && caret <= 4) {
                      e.preventDefault();
                      requestAnimationFrame(() => input.setSelectionRange(4, 4));
                    }
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const text = e.clipboardData.getData("text") || "";
                    const next = toDigitsFromValue(text);
                    setPhoneDigits(next);
                    setAddr((s) => ({ ...s, phone: formatFromDigits(next) }));
                    requestAnimationFrame(() => {
                      if (phoneRef.current) {
                        const end = formatFromDigits(next).length;
                        phoneRef.current.focus();
                        phoneRef.current.setSelectionRange(end, end);
                      }
                    });
                  }}
                  onChange={(e) => {
                    const nextDigits = toDigitsFromValue(e.target.value);
                    setPhoneDigits(nextDigits);
                    const nextFormatted = formatFromDigits(nextDigits);
                    setAddr((s) => ({ ...s, phone: nextFormatted }));
                    requestAnimationFrame(() => {
                      if (phoneRef.current) {
                        const end = nextFormatted.length;
                        phoneRef.current.focus();
                        phoneRef.current.setSelectionRange(end, end);
                      }
                    });
                  }}
                  placeholder="+90 5xx xxx xx xx"
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
                {anyNationalDigits && !isValidDigits(phoneDigits) && (
                  <p className="mt-1 text-xs text-red-600">Lütfen geçerli bir GSM numarası girin (örn. +90 5xx xxx xx xx).</p>
                )}
              </div>

              <div className="col-span-full mt-2 flex items-center justify-between gap-4">
                <label className="flex select-none items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={addr.saveForNext}
                    onChange={(e) => setAddr((s) => ({ ...s, saveForNext: e.target.checked }))}
                  />
                  Bir sonraki işlem için adresi kaydet
                </label>

                <button
                  type="submit"
                  disabled={!addressValid || actionPending}
                  aria-busy={actionPending}
                  className="inline-flex items-center justify-center rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
                  aria-label="Kargoya Geç"
                >
                  {actionPending ? "Kaydediliyor…" : "Kargoya Geç"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-1 text-sm text-gray-700">
              <div className="font-medium">
                {addr.firstName} {addr.lastName}
              </div>
              <div>{addr.phone || "-"}</div>
              <div>
                {addr.city}, {addr.district}, {addr.postal || "-"}
              </div>
              <div className="text-gray-600">{addr.line1}</div>
            </div>
          )}
        </div>

        {/* STEP 2: KARGO */}
        <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
          <StepHeader n={2} title="Kargo" active={step === 2} done={step > 2} onEdit={() => setStep(2)} />
          {step === 2 ? (
            <>
              <div className="space-y-2">
                {shippings.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shipping"
                        checked={shippingId === s.id}
                        onChange={() => setShippingId(s.id)}
                      />
                      <span className="text-sm">{s.name}</span>
                    </div>
                    <span className="text-sm font-medium">{s.fee.toFixed(2)} {currency}</span>
                  </label>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!shippingId && shippings[0]) setShippingId(shippings[0].id);
                    setStep(3);
                  }}
                  className="inline-flex items-center justify-center rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white"
                >
                  Ödemeye Geç
                </button>
              </div>
            </>
          ) : (
            <div className="text-sm">Kargo Bedeli / {currency} {(selectedShipping?.fee ?? 0).toFixed(2)}</div>
          )}
        </div>

        {/* STEP 3: ÖDEME */}
        <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
          <StepHeader n={3} title="Ödeme" active={step === 3} done={false} />
          {step === 3 ? (
            <>
              <div className="mb-3 grid gap-2">
                {payments.length === 0 ? (
                  <div className="text-sm text-gray-600">Ödeme yöntemi bulunamadı.</div>
                ) : (
                  payments.map((p) => (
                    <label key={p.id} className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentId === p.id}
                        onChange={() => setPaymentId(p.id)}
                      />
                      <span className="text-sm">{p.name}</span>
                    </label>
                  ))
                )}
              </div>

              {isCardPayment && (
                <div className="mb-4 rounded-xl border border-gray-200 p-3">
                  <CardFields value={card} onChange={setCard} />
                </div>
              )}

              {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
              {ok && <p className="text-sm text-green-700">{ok}</p>}

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Ara Toplam: <span className="font-medium">{subtotal.toFixed(2)} {currency}</span>{" "}
                  • Kargo: <span className="font-medium">{(selectedShipping?.fee ?? 0).toFixed(2)} {currency}</span>{" "}
                  • Toplam: <span className="font-semibold">{grandTotal.toFixed(2)} {currency}</span>
                </div>
                <button
                  type="button"
                  disabled={
                    pending ||
                    !hasSession ||
                    !addressValid ||
                    !hasShipping ||
                    !hasPayment ||
                    (isCardPayment && !cardOk)
                  }
                  onClick={submitOrder}
                  className="inline-flex items-center justify-center rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {pending ? "İşleniyor…" : "Siparişi Tamamla"}
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-600">Ödemeye geçmek için kargoyu onaylayın.</p>
          )}
        </div>
      </section>
    </LayoutShell>
  );
}
