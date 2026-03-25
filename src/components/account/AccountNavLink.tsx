"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export default function AccountNavLink({
  href,
  children,
  exact = false,
}: {
  href: string;
  children: React.ReactNode;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "block rounded-xl px-3 py-2 text-sm transition-colors",
        active
          ? "bg-gray-100 text-gray-900 ring-1 ring-gray-200"
          : "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
      )}
    >
      {children}
    </Link>
  );
}
