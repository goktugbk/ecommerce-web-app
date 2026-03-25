// src/app/(site)/account/(private)/ProfileForm.tsx
"use client";

import * as React from "react";
import { updateProfileAction } from "@/app/(site)/account/actions/profile";
import PhoneField from "@/components/form/PhoneField";
import { Button } from "@/components/ui/Button";

type Props = {
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
};
type State = { ok: boolean; error?: string };

export default function ProfileForm({
  firstName,
  lastName,
  email,
  phone,
}: Props) {
  type ProfileResult = { ok: boolean; error?: string };
  const [state, action, pending] = React.useActionState<ProfileResult, FormData>(
    updateProfileAction,
    { ok: false }
  );

  return (
    <form action={action} className="space-y-8">
      <div className="grid gap-8 md:grid-cols-2">
        <Field label="Ad" required>
          <UnderInput
            name="firstName"
            defaultValue={firstName ?? ""}
            autoComplete="given-name"
            required
          />
        </Field>

        <Field label="Soyad" required>
          <UnderInput
            name="lastName"
            defaultValue={lastName ?? ""}
            autoComplete="family-name"
            required
          />
        </Field>

        <Field label="Telefon" required>
          <PhoneField
            name="phone"
            defaultCountry="TR"
            initialValue={phone ?? ""} // 👈 önemli
            variant="underline" // 👈 alttan çizgili stil
          />
        </Field>

        <Field label="Email" required>
          <UnderInput
            type="email"
            name="email"
            defaultValue={email}
            autoComplete="email"
            required
            disabled
            className="bg-gray-100 text-gray-700"
          />
        </Field>
      </div>

      {state?.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="pt-2 w-full md:w-[360px]">
        <div className="rounded-md bg-black p-1">
          {" "}
          {/* 👈 dıştaki siyah alan */}
          <Button
            type="submit"
            size="lg"
            variant="ghost" // 👈 buton şeffaf
            className="w-full text-white hover:bg-white/10"
            isLoading={pending}
          >
            KAYDET
          </Button>
        </div>
      </div>
    </form>
  );
}

/* ---------------- küçük yardımcılar ---------------- */

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold">
        {required && <span className="mr-1 text-red-500">*</span>}
        {label}
      </label>
      {children}
    </div>
  );
}

function UnderInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "block w-full border-0 border-b border-gray-300 bg-transparent px-0 py-2",
        "text-[15px] outline-none ring-0",
        "focus:border-black focus:ring-0",
        props.className ?? "",
      ].join(" ")}
    />
  );
}
