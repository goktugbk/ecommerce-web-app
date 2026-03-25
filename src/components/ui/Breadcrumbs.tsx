// src/components/ui/Breadcrumbs.tsx
import Link from "next/link";

export type Crumb = { label: string; href?: string };

export default function Breadcrumbs({
  items,
  separator = "/",
}: {
  items: Crumb[];
  separator?: string;
}) {
  if (!items?.length) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-gray-600">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1">
              {it.href && !last ? (
                <Link
                  href={it.href}
                  className="hover:text-gray-900 text-gray-700"
                >
                  {it.label}
                </Link>
              ) : (
                <span
                  className="font-medium text-gray-900"
                  aria-current={last ? "page" : undefined}
                >
                  {it.label}
                </span>
              )}
              {!last && (
                <span aria-hidden="true" className="text-gray-400">
                  {separator}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
