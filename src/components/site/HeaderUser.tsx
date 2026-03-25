"use client";

import Link from "next/link";
import { User as UserIcon } from "lucide-react";
import { useSessionUser } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

function initials(firstName?: string | null, lastName?: string | null) {
  const a = (firstName ?? "").trim()[0] ?? "";
  const b = (lastName ?? "").trim()[0] ?? "";
  const init = (a + b).toUpperCase();
  return init || undefined;
}

export default function HeaderUser() {
  const { user: me, loading } = useSessionUser();

  if (loading) {
    return (
      <div className="p-2 text-gray-400">
        <UserIcon className="h-5 w-5 animate-pulse" />
      </div>
    );
  }

  if (!me) {
    return (
      <Link
        href="/account/login"
        aria-label="Giriş Yap"
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
          "hover:bg-gray-100"
        )}
      >
        <UserIcon className="h-5 w-5" />
      </Link>
    );
  }

  const init = initials(me.firstName, me.lastName);

  return (
    <Link
      href="/account"
      aria-label="Hesabım"
      title={`${me.firstName ?? ""} ${me.lastName ?? ""}`.trim()}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-md text-sm font-semibold transition-colors",
        "hover:bg-gray-100"
      )}
    >
      {init ?? <UserIcon className="h-5 w-5" />}
    </Link>
  );
}
