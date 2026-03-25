"use client";

import Link from "next/link";

type Props = {
  page: number;
  totalPages: number;
  q?: string;
  categorySlug?: string;
  sort?: string;
  limit?: number;
  alwaysShow?: boolean; // 👈 yeni
};

export default function Pagination({
  page,
  totalPages,
  q,
  categorySlug,
  sort,
  limit = 24,
  alwaysShow = false,
}: Props) {
  // 👇 Tek sayfa olsa bile göstermek istiyorsan null döndürme
  if (!alwaysShow && totalPages <= 1) return null;

  const makeHref = (p: number) => {
    const usp = new URLSearchParams();
    if (q) usp.set("q", q);
    if (categorySlug && categorySlug !== "all")
      usp.set("category", categorySlug);
    if (sort && sort !== "new") usp.set("sort", sort);
    if (limit && limit !== 24) usp.set("limit", String(limit));
    usp.set("page", String(p));
    return `/products?${usp.toString()}`;
  };

  const windowSize = 2;
  const pages: (number | "...")[] = [];
  const first = 1;
  const last = Math.max(1, totalPages); // güvenlik
  const start = Math.max(first, page - windowSize);
  const end = Math.min(last, page + windowSize);

  pages.push(first);
  if (start > first + 1) pages.push("...");
  for (let i = start; i <= end; i++) {
    if (i !== first && i !== last) pages.push(i);
  }
  if (end < last - 1) pages.push("...");
  if (last > first) pages.push(last);

  const prevDisabled = page <= 1 || last === 1;
  const nextDisabled = page >= last || last === 1;

  return (
    <nav className="mt-8 flex items-center justify-center gap-2 flex-wrap">
      {/* Önceki */}
      <Link
        href={prevDisabled ? "#" : makeHref(Math.max(1, page - 1))}
        aria-disabled={prevDisabled}
        className={`px-3 py-1 rounded border text-sm ${
          prevDisabled
            ? "pointer-events-none opacity-50"
            : "bg-white hover:bg-gray-50"
        }`}
      >
        ‹ Önceki
      </Link>

      {/* Sayılar */}
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`dots-${i}`} className="px-2 text-gray-400 select-none">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={makeHref(p)}
            aria-current={p === page ? "page" : undefined}
            className={`px-3 py-1 rounded border text-sm ${
              p === page
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-gray-50"
            }`}
          >
            {p}
          </Link>
        ),
      )}

      {/* Sonraki */}
      <Link
        href={nextDisabled ? "#" : makeHref(Math.min(last, page + 1))}
        aria-disabled={nextDisabled}
        className={`px-3 py-1 rounded border text-sm ${
          nextDisabled
            ? "pointer-events-none opacity-50"
            : "bg-white hover:bg-gray-50"
        }`}
      >
        Sonraki ›
      </Link>
    </nav>
  );
}
