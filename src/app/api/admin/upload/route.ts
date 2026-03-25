// src/app/api/admin/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { z } from "zod";
import { getSessionUserFromRequest, assertAdminApi } from "@/lib/auth-server";
import { ensureCsrf } from "@/lib/security/csrf";
import { logAdminAction } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------------- Cloudinary config ---------------- */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_API_SECRET || "",
});

const UploadResponse = z.object({
  asset_id: z.string().optional(),
  public_id: z.string(),
  secure_url: z.string().url(),
  width: z.number().optional(),
  height: z.number().optional(),
});

/* ---------------- JSON helpers ---------------- */
function jsonErr(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...(extra ?? {}) }, { status });
}
function jsonOk(body?: Record<string, unknown>, status = 200) {
  return NextResponse.json({ ok: true, ...(body ?? {}) }, { status });
}

/* ---------------- POST ---------------- */
export async function POST(req: NextRequest) {
  // 1) CSRF (header+cookie ve origin)
  await ensureCsrf(req);

  // 2) Admin guard (401/403)
  const guard = await assertAdminApi(req);
  if (guard) return guard;

  // 3) Kullanıcı (audit için)
  const me = await getSessionUserFromRequest(req);
  if (!me) return jsonErr("Unauthorized", 401);

  // 4) Cloudinary env kontrol
  const ready =
    !!process.env.CLOUDINARY_CLOUD_NAME &&
    !!process.env.CLOUDINARY_API_KEY &&
    !!process.env.CLOUDINARY_API_SECRET;
  if (!ready) return jsonErr("Cloudinary env eksik", 500);

  try {
    const form = await req.formData();
    const files = form.getAll("file").filter(Boolean) as File[];
    if (!files.length) return jsonErr("Dosya yok", 400);

    const results: Array<z.infer<typeof UploadResponse>> = [];

    for (const f of files) {
      const arrayBuf = await f.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);

      const uploaded = await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "eticaret", resource_type: "image" },
          (err, result) => (err ? reject(err) : resolve(result)),
        );
        stream.end(buffer);
      });

      const parsed = UploadResponse.parse(uploaded);
      results.push(parsed);
    }

    // audit log
    try {
      await logAdminAction({
        adminId: me.id,
        action: "upload",
        path: "/api/admin/upload",
        details: { count: results.length, items: results.map((x) => x.public_id) },
      });
    } catch {}

    return NextResponse.json(
      {
        ok: true,
        files: results.map((u) => ({
          url: u.secure_url,
          publicId: u.public_id,
          width: u.width,
          height: u.height,
        })),
      },
      { status: 201 },
    );
  } catch (e: any) {
    console.error("upload error:", e);
    return jsonErr("Upload failed", 500, { reason: e?.message });
  }
}
