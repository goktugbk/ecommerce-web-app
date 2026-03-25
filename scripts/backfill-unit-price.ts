import { PrismaClient, Prisma } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.cartItem.findMany({
    where: { unitPrice: null },
    include: { product: { select: { price: true } } },
  });

  let updated = 0;
  for (const it of items) {
    const p = it.product;
    if (!p?.price) continue;

    const unit = p.price instanceof Prisma.Decimal ? p.price : new Prisma.Decimal(p.price as any);

    await prisma.cartItem.update({
      where: { id: it.id },
      data: { unitPrice: unit },
    });
    updated++;
  }

  console.log(`✅ Güncellenen kayıt: ${updated}`);
}

main().finally(() => prisma.$disconnect());
