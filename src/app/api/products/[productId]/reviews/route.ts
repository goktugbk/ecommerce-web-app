// src/app/api/products/[productId]/reviews/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-server";

/* ---------------- helpers ---------------- */

function maskSurname(s: string) {
  const t = s?.trim() ?? "";
  if (!t) return "";
  return t[0] + "*".repeat(Math.max(1, t.length - 1));
}

function formatDisplayName(user: { firstName: string | null; lastName: string | null }) {
  const fn = user.firstName?.trim() ?? "";
  const ln = user.lastName?.trim() ?? "";
  if (fn && ln) return `${fn} ${maskSurname(ln)}`;
  return fn || ln || "Anonim";
}

/* ---------------- GET ---------------- */

export async function GET(
  _req: Request,
  { params }: { params: { productId: string } },
) {
  const productId = params.productId;

  const rows = await prisma.review.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      // name alanını DB'de tutuyorsun ama listelemede kullanıcı adını maskeleyerek gösteriyoruz
      user: { select: { firstName: true, lastName: true } },
    },
  });

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      rating: r.rating ?? undefined,
      comment: r.comment,
      createdAt: r.createdAt,
      name: r.user ? formatDisplayName(r.user) : "Anonim",
    })),
  );
}

/* ---------------- POST ---------------- */

export async function POST(
  req: Request,
  { params }: { params: { productId: string } },
) {
  const me = await getSessionUser();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const productId = params.productId;
  const body = await req.json().catch(() => ({}));

  const rating =
    typeof body.rating === "number" && body.rating >= 1 && body.rating <= 5
      ? body.rating
      : null;
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";

  if (!comment) {
    return NextResponse.json({ error: "Yorum metni gerekli" }, { status: 400 });
  }

  // Review.name zorunlu olduğu için güvenli bir değer üretelim
  const safeName = `${me.firstName ?? ""} ${me.lastName ?? ""}`.trim()
    || (me as any).name
    || (me as any).email?.split?.("@")?.[0]
    || "Anonim";

  const review = await prisma.review.create({
    data: {
      productId,
      userId: me.id,
      rating,
      comment,
      name: safeName, // <-- ZORUNLU name alanını doldurduk
    },
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      user: { select: { firstName: true, lastName: true } },
    },
  });

  return NextResponse.json({
    id: review.id,
    rating: review.rating ?? undefined,
    comment: review.comment,
    createdAt: review.createdAt,
    name: review.user ? formatDisplayName(review.user) : "Anonim",
  });
}
