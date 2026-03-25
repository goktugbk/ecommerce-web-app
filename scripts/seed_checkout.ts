// scripts/seed_checkout.ts (tek sefer)
import { prisma } from "../src/lib/prisma";
async function main() {
  await prisma.shippingMethod.upsert({
    where: { code: "STD" },
    update: {},
    create: { code: "STD", name: "Standart Kargo", fee: 49.90 },
  });
  await prisma.paymentMethod.upsert({
    where: { code: "COD" },
    update: {},
    create: { code: "COD", name: "Kapıda Ödeme" },
  });
  await prisma.paymentMethod.upsert({
    where: { code: "STRIPE" },
    update: {},
    create: { code: "STRIPE", name: "Kredi Kartı (Test)" },
  });
}
main();
