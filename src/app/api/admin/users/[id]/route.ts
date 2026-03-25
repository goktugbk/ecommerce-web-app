// src/app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getSessionUser, assertAdminApi } from "@/lib/auth-server";
import { ensureCsrf } from "@/lib/security/csrf";
import { logAdminAction } from "@/lib/audit";

/* ---------------- Helpers ---------------- */
async function requireAdmin() {
  const me = await getSessionUser();
  if (!me || me.role !== "ADMIN") {
    return {
      ok: false as const,
      res: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true as const, me };
}
function jsonErr(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...(extra ?? {}) }, { status });
}
function jsonOk(body?: Record<string, unknown>, status = 200) {
  return NextResponse.json({ ok: true, ...(body ?? {}) }, { status });
}

/* ---------------- Schema ---------------- */
const PatchSchema = z.object({
  role: z.enum(["ADMIN", "CUSTOMER"]),
});

/* ---------------- PATCH /api/admin/users/[id] ---------------- */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  // Kimlik + CSRF
  const actor = await assertAdminApi();
  await ensureCsrf(req);

  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return jsonErr("ValidationError", 400, { issues: parsed.error.flatten() });
  }
  const targetId = params.id;
  const nextRole = parsed.data.role;

  // Hedef kullanıcıyı getir
  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, role: true, email: true, firstName: true, lastName: true },
  });
  if (!target) return jsonErr("UserNotFound", 404);

  // No-op kontrolü
  if (target.role === nextRole) {
    return jsonOk({ changed: false, role: target.role });
  }

  // Kendini CUSTOMER yapmayı engelle
  if (target.id === auth.me.id && nextRole !== "ADMIN") {
    return jsonErr("CannotDemoteSelf", 400);
  }

  // Son admin’i CUSTOMER’a düşürmeyi engelle
  if (target.role === "ADMIN" && nextRole === "CUSTOMER") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return jsonErr("CannotDemoteLastAdmin", 400);
    }
  }

  // Güncelle
  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { role: nextRole },
    select: { id: true, role: true },
  });

  // Audit
  await logAdminAction({
    actorId: actor.id,
    action: "user.updateRole",
    target: target.id,
    meta: {
      from: target.role,
      to: nextRole,
      email: target.email ?? null,
      name: `${target.firstName ?? ""} ${target.lastName ?? ""}`.trim() || null,
    },
  });

  return jsonOk({ changed: true, user: updated });
}
