// src/components/reviews/ReviewBlock.tsx
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-server";
import WriteReviewButton from "./WriteReviewButton";

function maskSurname(lastName?: string | null) {
  const t = (lastName ?? "").trim();
  if (!t) return "";
  return t[0] + "*".repeat(Math.max(1, t.length - 1));
}

export default async function ReviewBlock({ productId }: { productId: string }) {
  const me = await getSessionUser();

  const reviews = await prisma.review.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  const items = reviews.map((r) => {
    const first = r.user?.firstName?.trim() ?? "";
    const lastMasked = maskSurname(r.user?.lastName);
    const displayName =
      first || lastMasked ? `${first}${first && lastMasked ? " " : ""}${lastMasked}` : "Anonim";

    return {
      id: r.id,
      rating: typeof r.rating === "number" ? r.rating : undefined,
      comment: r.comment,
      createdAt: r.createdAt,
      name: displayName,
    };
  });

  return (
    <section className="mt-12">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-2xl font-semibold">Yorumlar</h3>
        <WriteReviewButton productId={productId} isLoggedIn={!!me} />
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500">Henüz yorum yok.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((r) => (
            <li key={r.id} className="rounded-xl border bg-white p-4">
              {/* Yıldızlar */}
              {typeof r.rating === "number" && (
                <div className="mb-1 text-yellow-500" aria-label={`Puan: ${r.rating} / 5`}>
                  {"★★★★★".slice(0, Math.min(5, r.rating))}
                  <span className="text-gray-300">
                    {"★★★★★".slice(Math.min(5, r.rating))}
                  </span>
                </div>
              )}

              <div className="mb-1 font-semibold">{r.name}</div>
              <div className="text-xs text-gray-500">
                {new Date(r.createdAt).toLocaleDateString("tr-TR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </div>

              {r.comment && <p className="mt-2 text-gray-800">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
