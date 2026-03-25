"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={`px-3 py-2 text-sm md:text-base transition-colors ${
        active ? "text-black font-semibold" : "text-gray-700 hover:text-black"
      }`}
    >
      {children}
    </Link>
  );
}
