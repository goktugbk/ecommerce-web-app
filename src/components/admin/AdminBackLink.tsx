"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminBackLink({
  label = "← Admin’e dön",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  const pathname = usePathname();
  // Admin panelinde bir alt sayfadaysak köke döndür
  const target = "/admin";

  return (
    <Link
      href={target}
      className={
        "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 " +
        className
      }
      aria-label="Admin ana panele dön"
    >
      {label}
    </Link>
  );
}
