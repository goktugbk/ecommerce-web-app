// prisma/seed.ts
import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Admin bilgileri
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "1234";

  // Şifre hash
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 11);

  // Admin kullanıcıyı oluştur/güncelle
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      email: ADMIN_EMAIL,
      passwordHash,
      role: Role.ADMIN,
      firstName: "Super",
      lastName: "Admin",
      phone: "0000000000", // zorunlu alanı doldurmak için dummy numara
    },
    update: {
      passwordHash,
      role: Role.ADMIN,
    },
  });

  console.log(`✅ Admin hazır: ${admin.email} (şifre: ${ADMIN_PASSWORD})`);

  // Örnek kategori ekle
  await prisma.category.upsert({
    where: { slug: "all" },
    create: {
      name: "Tüm Ürünler",
      slug: "all",
      homeFeatured: true,
      homeOrder: 1,
    },
    update: {},
  });

  console.log("📦 Örnek kategori eklendi: all");

  // Audit tablosu varsa örnek kayıt
  try {
    // @ts-ignore: optional
    await (prisma as any).adminAudit?.create?.({
      data: {
        adminId: admin.id,
        action: "SEED_INIT",
        message: "Seed sırasında otomatik audit girişi",
      },
    });
    console.log("📝 Audit kaydı eklendi");
  } catch {
    // AdminAudit modeli yoksa sessiz geç
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("❌ Seed hata:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
