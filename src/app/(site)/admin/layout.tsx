// src/app/(site)/admin/layout.tsx
import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/auth-server";

// <head> içine CSRF token'ı meta olarak bas
export async function generateMetadata(): Promise<Metadata> {
  const store = await cookies();
  const csrf = store.get("csrf")?.value ?? "";
  return {
    other: {
      "csrf-token": csrf,
    },
  };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin("/admin");

  return (
    <div className="mx-auto max-w-6xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/" className="font-semibold">
          Mağaza
        </Link>
        <div className="text-sm text-gray-600">
          Admin: {user.firstName} {user.lastName} ({user.email})
        </div>
      </header>
      {children}
    </div>
  );
}
