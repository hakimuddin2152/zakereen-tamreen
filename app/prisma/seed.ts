import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = new (PrismaClient as any)({ adapter }) as InstanceType<typeof PrismaClient>;

async function main() {
  console.log("Seeding database…");

  // ── Users ──────────────────────────────────────────────────────────────────
  const godPwd    = await hash(process.env.SEED_GOD_PASSWORD    ?? "admin@123", 12);
  const adminPwd  = await hash(process.env.SEED_ADMIN_PASSWORD  ?? "admin@123", 12);
  const memberPwd = await hash(process.env.SEED_MEMBER_PASSWORD ?? "user@123",  12);

  // God
  await db.user.upsert({
    where: { username: "god" },
    create: { username: "god", displayName: "Admin", password: godPwd, role: "GOD" },
    update: { password: godPwd },
  });
  console.log("✓ God:   god");

  // Named admins
  const admins = [
    { username: "husain.rassawala", displayName: "Husain Rassawala" },
    { username: "husain.vohra",     displayName: "Husain Vohra"     },
  ];
  for (const u of admins) {
    await db.user.upsert({
      where: { username: u.username },
      create: { ...u, password: adminPwd, role: "ADMIN" },
      update: { password: adminPwd },
    });
    console.log(`✓ Admin: ${u.username}`);
  }

  // Members
  const members = [
    { username: "mufaddal.poonawala",   displayName: "Mufaddal Poonawala"   },
    { username: "murtaza.vajihee",      displayName: "Murtaza Vajihee"      },
    { username: "hakimuddin.attawala",  displayName: "Hakimuddin Attawala"  },
    { username: "abdulqadir.dhanerawala", displayName: "AbdulQadir Dhanerawala" },
  ];
  for (const u of members) {
    await db.user.upsert({
      where: { username: u.username },
      create: { ...u, password: memberPwd, role: "PARTY_MEMBER" },
      update: { password: memberPwd },
    });
    console.log(`✓ Member: ${u.username}`);
  }

  // ── Kalaams ────────────────────────────────────────────────────────────────
  const kalaams = [
    // Marasiya
    { title: "Matami",                    category: "MARASIYA" as const },
    { title: "Suraj se zara kehdo",       category: "MARASIYA" as const },
    { title: "Mazlum e Karbala ko",       category: "MARASIYA" as const },
    { title: "Zalzalo me duniya thi",     category: "MARASIYA" as const },
    { title: "Sibte rasool lut gaya",     category: "MARASIYA" as const },
    // Salaam
    { title: "Ye pukari zainab e khasta tan",              category: "SALAAM" as const },
    { title: "Dekhe madina sara",                          category: "SALAAM" as const },
    { title: "Kafla e husaini ki ye shaan he",             category: "SALAAM" as const },
    { title: "Ran me ye sitam aale payambar pe hua he",   category: "SALAAM" as const },
    // Madeh
    { title: "Ae shahe aali qadr",        category: "MADEH" as const },
    { title: "Manind andaleeb ke",        category: "MADEH" as const },
  ];

  const kalaamMap: Record<string, string> = {}; // title -> id
  for (const k of kalaams) {
    let rec = await db.kalaam.findFirst({ where: { title: k.title } });
    if (!rec) rec = await db.kalaam.create({ data: k });
    kalaamMap[k.title] = rec.id;
  }
  console.log(`✓ ${kalaams.length} kalaams seeded`);

  // ── Sample session for today ───────────────────────────────────────────────
  const today = new Date();
  today.setHours(20, 0, 0, 0); // 8 PM

  // Pick one from each category for the session
  const sessionKalaamIds = [
    kalaamMap["Matami"],                          // Marasiya
    kalaamMap["Ye pukari zainab e khasta tan"],   // Salaam
    kalaamMap["Ae shahe aali qadr"],              // Madeh
  ];

  // Use all active non-GOD users as attendees
  const allUsers = await db.user.findMany({
    where: { isActive: true, role: { not: "GOD" } },
    select: { id: true },
  });
  const memberIds = allUsers.map((u: { id: string }) => u.id);

  // Mark all prerequisites done for every member × every session kalaam
  for (const userId of memberIds) {
    for (const kalaamId of sessionKalaamIds) {
      await db.kalaamPrerequisite.upsert({
        where: { userId_kalaamId: { userId, kalaamId } },
        create: { userId, kalaamId, lehenDone: true, hifzDone: true },
        update: { lehenDone: true, hifzDone: true },
      });
    }
  }

  // Create the session (skip if one exists for today already)
  const existing = await db.session.findFirst({
    where: { date: { gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()) } },
  });
  if (!existing) {
    await db.session.create({
      data: {
        date: today,
        notes: "Inaugural practice session",
        kalaams: {
          create: sessionKalaamIds.map((kalaamId) => ({ kalaamId })),
        },
        attendees: {
          create: memberIds.map((userId: string) => ({ userId })),
        },
      },
    });
    console.log("✓ Sample session created for today with 1 Marasiya, 1 Salaam, 1 Madeh");
  } else {
    console.log("ℹ  Session for today already exists — skipped");
  }

  console.log("\n✅ Seed complete!");
  console.log("   God:    god");
  console.log("   Admins: husain.rassawala, husain.vohra");
  console.log("   Members: mufaddal.poonawala, murtaza.vajihee,");
  console.log("            hakimuddin.attawala, abdulqadir.dhanerawala");
  console.log("   Passwords set via SEED_GOD_PASSWORD / SEED_ADMIN_PASSWORD / SEED_MEMBER_PASSWORD env vars");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
