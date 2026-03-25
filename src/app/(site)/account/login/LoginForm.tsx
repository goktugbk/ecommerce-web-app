// src/app/(site)/account/login/LoginForm.tsx
"use client";

import * as React from "react";
import { loginActionState } from "@/app/(site)/account/actions/auth";
import { Button } from "@/components/ui/Button";

type State = { ok: boolean; error?: string };
const initialState: State = { ok: false };

export default function LoginForm({
  returnTo = "/account",
}: {
  returnTo?: string;
}) {
  const [state, formAction, isPending] = React.useActionState(
    loginActionState,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="returnTo" value={returnTo} />

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

      <div className="flex flex-col gap-1">
        <label className="text-sm">Şifre</label>
        <input
          type="password"
          name="password"
          required
          className="rounded-lg border p-2"
          placeholder="••••••••"
          autoComplete="current-password"
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
        {isPending ? "Giriş yapılıyor..." : "Giriş Yap"}
      </Button>
    </form>
  );
}
