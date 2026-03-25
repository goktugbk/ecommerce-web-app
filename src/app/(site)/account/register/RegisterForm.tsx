// src/app/(site)/account/register/RegisterForm.tsx
"use client";

import * as React from "react";
import { registerActionState } from "@/app/(site)/account/actions/auth";
import PhoneField from "@/components/form/PhoneField";
import { Button } from "@/components/ui/Button";

type State = { ok: boolean; error?: string };
const initialState: State = { ok: false };

export default function RegisterForm({ returnTo = "" }: { returnTo?: string }) {
  // useFormState yerine useActionState
  const [state, formAction, isPending] = React.useActionState(
    registerActionState,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="returnTo" value={returnTo} />

      <div className="flex gap-3">
        <div className="flex w-1/2 flex-col gap-1">
          <label className="text-sm">Ad</label>
          <input
            name="firstName"
            required
            className="rounded-lg border p-2"
            placeholder="Ad"
            autoComplete="given-name"
          />
        </div>
        <div className="flex w-1/2 flex-col gap-1">
          <label className="text-sm">Soyad</label>
          <input
            name="lastName"
            required
            className="rounded-lg border p-2"
            placeholder="Soyad"
            autoComplete="family-name"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm">E-posta</label>
        <input
          type="email"
          name="email"
          required
          className="rounded-lg border p-2"
          placeholder="mail@ornek.com"
          autoComplete="email"
        />
      </div>

      {/* PhoneField'in formData'ya "phone" yazması için name veriyoruz */}
      <PhoneField name="phone" defaultCountry="TR" />

      <div className="flex flex-col gap-1">
        <label className="text-sm">Şifre</label>
        <input
          type="password"
          name="password"
          required
          className="rounded-lg border p-2"
          placeholder="••••••••"
          autoComplete="new-password"
        />
      </div>

      {state?.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <Button
        className="w-full rounded-xl bg-black p-2 text-white disabled:opacity-60"
        disabled={isPending}
        type="submit"
        variant="default"
      >
        {isPending ? "Kaydediliyor..." : "Kayıt Ol"}
      </Button>
    </form>
  );
}
