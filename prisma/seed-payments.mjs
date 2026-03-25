import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  await prisma.paymentMethod.upsert({
    where: { code: "pay-cc" },
    update: { isActive: true, name: "Kredi Kartı" },
    create: { code: "pay-cc", name: "Kredi Kartı", isActive: true },
  });
  await prisma.paymentMethod.upsert({
    where: { code: "pay-cod" },
    update: { isActive: true, name: "Kapıda Ödeme (Nakit)" },
    create: { code: "pay-cod", name: "Kapıda Ödeme (Nakit)", isActive: true },
  });

  await prisma.shippingMethod.upsert({
    where: { code: "ship-std" },
    update: { isActive: true, name: "Standart Kargo", fee: 0 },
    create: { code: "ship-std", name: "Standart Kargo", fee: 0, isActive: true },
  });
  await prisma.shippingMethod.upsert({
    where: { code: "ship-exp" },
    update: { isActive: true, name: "Hızlı Kargo", fee: 49.9 },
    create: { code: "ship-exp", name: "Hızlı Kargo", fee: 49.9, isActive: true },
  });
}
main().finally(() => prisma.$disconnect());
