// scripts/backfill-orders.ts
import { prisma } from "@/lib/prisma";

function isEmpty(s?: string | null) {
  return !s || !s.trim();
}
function fullName(first?: string | null, last?: string | null) {
  return `${first ?? ""} ${last ?? ""}`.trim();
}

async function run() {
  // 1) Kandidatları çek: userId DOLU olan ve snapshot'larında eksik görünenler
  const orders = await prisma.order.findMany({
    where: {
      userId: { not: null },
      OR: [
        { contactName: null },
        { contactEmail: null },
        { contactPhone: null },
        { shipFirstName: null },
        { shipLastName: null },
        { shipLine1: null },
        { shipCity: null },
        { shipDistrict: null },
        { shipPostal: null },
        // boş string olabilecekler için "contains" filtresiyle kaba yaklaşım:
        { contactName: { equals: "" } },
        { contactEmail: { equals: "" } },
        { contactPhone: { equals: "" } },
        { shipFirstName: { equals: "" } },
        { shipLastName: { equals: "" } },
        { shipLine1: { equals: "" } },
        { shipCity: { equals: "" } },
        { shipDistrict: { equals: "" } },
        { shipPostal: { equals: "" } },
      ],
    },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          Address: {
            orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
            take: 1,
            select: { line1: true, line2: true, city: true, state: true, postal: true, country: true },
          },
        },
      },
    },
  });

  console.log(`Backfill hedefi: ${orders.length} sipariş`);

  let updated = 0;
  for (const o of orders) {
    const u = o.user;
    if (!u) continue; // user yoksa geçmiş guest siparişi → dolduramayız

    const a = u.Address?.[0];
    const data: any = {};

    // contact*
    if (isEmpty(o.contactName))  data.contactName  = fullName(u.firstName, u.lastName) || u.email || o.contactName;
    if (isEmpty(o.contactEmail)) data.contactEmail = u.email ?? o.contactEmail;
    if (isEmpty(o.contactPhone)) data.contactPhone = u.phone ?? o.contactPhone;

    // ship* (adres snapshot)
    if (isEmpty(o.shipFirstName)) data.shipFirstName = u.firstName ?? o.shipFirstName;
    if (isEmpty(o.shipLastName))  data.shipLastName  = u.lastName  ?? o.shipLastName;
    if (isEmpty(o.shipEmail))     data.shipEmail     = u.email     ?? o.shipEmail;
    if (isEmpty(o.shipPhone))     data.shipPhone     = u.phone     ?? o.shipPhone;

    if (a) {
      if (isEmpty(o.shipLine1))    data.shipLine1    = a.line1 ?? o.shipLine1;
      if (isEmpty(o.shipLine2))    data.shipLine2    = a.line2 ?? o.shipLine2;
      if (isEmpty(o.shipDistrict)) data.shipDistrict = a.state ?? o.shipDistrict; // state = ilçe/semt
      if (isEmpty(o.shipCity))     data.shipCity     = a.city ?? o.shipCity;
      if (isEmpty(o.shipPostal))   data.shipPostal   = a.postal ?? o.shipPostal;
      if (isEmpty(o.shipCountry))  data.shipCountry  = a.country ?? "TR";
    }

    if (Object.keys(data).length > 0) {
      await prisma.order.update({ where: { id: o.id }, data });
      updated++;
    }
  }

  console.log(`Backfill bitti. Güncellenen sipariş: ${updated}/${orders.length}`);
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
