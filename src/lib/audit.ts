// src/lib/audit.ts
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

type LogArgs = {
  adminId: string;
  action: string;
  entity?: string;
  entityId?: string;
  message?: string;
  meta?: any;
  path?: string;
};

export async function logAdminAction(args: LogArgs) {
  try {
    const hs = headers();
    const ipHeader = hs.get("x-forwarded-for") || hs.get("x-real-ip") || "";
    const ip = ipHeader.split(",")[0]?.trim() || undefined;
    const userAgent = hs.get("user-agent") || undefined;

    const data: any = {
      adminId: args.adminId,
      action: args.action,
      entity: args.entity,
      entityId: args.entityId,
      message: args.message ?? undefined,
      meta: args.meta ?? undefined,
      ip,
      userAgent,
    };

    // Tolerant client (older Prisma clients)
    const anyPrisma: any = prisma as any;
    const created = await anyPrisma.adminAudit?.create?.({ data });
    return created ?? null;
  } catch (err) {
    console.warn("[audit] skipped:", (err as any)?.message || err);
    return null;
  }
}
