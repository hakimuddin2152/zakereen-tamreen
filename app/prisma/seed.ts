import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = new (PrismaClient as any)({ adapter }) as InstanceType<typeof PrismaClient>;

async function main() {
  console.log("Seeding database…");

  // Seed Lehen types
  const lehenTypes = [
    "Bayat", "Saba", "Hijaz", "Rast", "Nahawand",
    "Kurd", "Ajam", "Sikah", "Jiharkah",
  ];

  for (const name of lehenTypes) {
    await db.lehenType.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }
  console.log(`✓ ${lehenTypes.length} Lehen types seeded`);

  // Create admin account
  const adminPassword = await hash("admin1234", 12);
  const admin = await db.user.upsert({
    where: { username: "admin" },
    create: {
      username: "admin",
      displayName: "Admin",
      password: adminPassword,
      role: "ADMIN",
    },
    update: {},
  });
  console.log(`✓ Admin account: username=admin password=admin1234`);

  // Seed a sample kalaam
  const existingKalaam = await db.kalaam.findFirst({ where: { title: "Aaj Ashura Hai" } });
  if (!existingKalaam) {
    await db.kalaam.create({
      data: {
        title: "Aaj Ashura Hai",
        poet: "Unknown",
        language: "Urdu",
      },
    });
  }
  console.log("✓ Sample kalaam seeded");

  console.log("\n✅ Seed complete!");
  console.log("   Login: admin / admin1234");
  console.log("   ⚠️  Change the admin password after first login!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
