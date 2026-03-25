import { NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary";
import { getSessionUser } from "@/lib/auth-server";

// Route Handler Node.js ortamında çalışmalı
export const runtime = "nodejs";

export async function POST(req: Request) {
  // 🔐 sadece admin
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "file gerekli" }, { status: 400 });
    }

    // File (Blob) → Buffer
    const arrayBuffer = await (file as File).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Cloudinary'ye stream upload
    const uploaded: any = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "eticaret/products", // klasör adı
          resource_type: "image",
          // transformation: [{ width: 1600, crop: "limit" }], // istersen sınırlama ekleyebilirsin
        },
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        },
      );
      stream.end(buffer);
    });

    // Örn: { secure_url, public_id, width, height, format ... }
    return NextResponse.json(
      {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        width: uploaded.width,
        height: uploaded.height,
      },
      { status: 201 },
    );
  } catch (e: any) {
    console.error("upload error:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
