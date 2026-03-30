import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hash } from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});
const adapter = new PrismaPg(pool);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = new (PrismaClient as any)({ adapter }) as InstanceType<typeof PrismaClient>;

async function main() {
  console.log("Seeding database (MVP 3 — clean slate)…");

  // ── Passwords ──────────────────────────────────────────────────────────────
  const godPwd    = await hash(process.env.SEED_GOD_PASSWORD    ?? "admin@123", 12);
  const mcPwd     = await hash(process.env.SEED_MC_PASSWORD     ?? "admin@123", 12);
  const pcPwd     = await hash(process.env.SEED_PC_PASSWORD     ?? "admin@123", 12);
  const memberPwd = await hash(process.env.SEED_MEMBER_PASSWORD ?? "user@123",  12);

  // ── GOD (developer) ────────────────────────────────────────────────────────
  const god = await db.user.upsert({
    where: { username: "god" },
    create: { username: "god", displayName: "Developer", password: godPwd, role: "GOD" },
    update: { password: godPwd },
  });
  console.log("✓ GOD:  god");

  // ── MC — Mauze Coordinators ────────────────────────────────────────────────
  const mc1 = await db.user.upsert({
    where: { username: "husain.rassawala" },
    create: { username: "husain.rassawala", displayName: "Husain Rassawala", password: mcPwd, role: "MC" },
    update: { password: mcPwd, role: "MC" },
  });
  const mc2 = await db.user.upsert({
    where: { username: "husain.vohra" },
    create: { username: "husain.vohra", displayName: "Husain Vohra", password: mcPwd, role: "MC" },
    update: { password: mcPwd, role: "MC" },
  });
  console.log("✓ MC:   husain.rassawala, husain.vohra");

  // ── PC — Party Coordinators (created without partyId first) ───────────────
  const pc1 = await db.user.upsert({
    where: { username: "mufaddal.poonawala" },
    create: { username: "mufaddal.poonawala", displayName: "Mufaddal Poonawala", password: pcPwd, role: "PC" },
    update: { password: pcPwd, role: "PC" },
  });
  const pc2 = await db.user.upsert({
    where: { username: "murtaza.vajihee" },
    create: { username: "murtaza.vajihee", displayName: "Murtaza Vajihee", password: pcPwd, role: "PC" },
    update: { password: pcPwd, role: "PC" },
  });
  console.log("✓ PC:   mufaddal.poonawala, murtaza.vajihee");

  // ── PM — Party Members (created without partyId first) ────────────────────
  const pm1 = await db.user.upsert({
    where: { username: "hakimuddin.attawala" },
    create: { username: "hakimuddin.attawala", displayName: "Hakimuddin Attawala", password: memberPwd, role: "PM" },
    update: { password: memberPwd, role: "PM" },
  });
  const pm2 = await db.user.upsert({
    where: { username: "abdulqadir.dhanerawala" },
    create: { username: "abdulqadir.dhanerawala", displayName: "AbdulQadir Dhanerawala", password: memberPwd, role: "PM" },
    update: { password: memberPwd, role: "PM" },
  });
  const pm3 = await db.user.upsert({
    where: { username: "taher.shujauddin" },
    create: { username: "taher.shujauddin", displayName: "Taher Shujauddin", password: memberPwd, role: "PM" },
    update: { password: memberPwd, role: "PM" },
  });
  console.log("✓ PM:   hakimuddin.attawala, abdulqadir.dhanerawala, taher.shujauddin");

  // ── IM — Individual Member (no party) ─────────────────────────────────────
  const im1 = await db.user.upsert({
    where: { username: "ali.individual" },
    create: { username: "ali.individual", displayName: "Ali (Individual)", password: memberPwd, role: "IM" },
    update: { password: memberPwd, role: "IM" },
  });
  console.log("✓ IM:   ali.individual");

  // ── Parties ────────────────────────────────────────────────────────────────
  const party1 = await db.party.upsert({
    where: { name: "Anjuman Hussainia" },
    create: {
      name: "Anjuman Hussainia",
      description: "Main party",
      coordinatorId: pc1.id,
    },
    update: { coordinatorId: pc1.id },
  });
  const party2 = await db.party.upsert({
    where: { name: "Markazi Party" },
    create: {
      name: "Markazi Party",
      description: "Second party",
      coordinatorId: pc2.id,
    },
    update: { coordinatorId: pc2.id },
  });
  console.log("✓ Parties: Anjuman Hussainia, Markazi Party");

  // Assign PMs and PCs to their parties
  await db.user.update({ where: { id: pc1.id },  data: { partyId: party1.id } });
  await db.user.update({ where: { id: pm1.id },  data: { partyId: party1.id } });
  await db.user.update({ where: { id: pm2.id },  data: { partyId: party1.id } });
  await db.user.update({ where: { id: pc2.id },  data: { partyId: party2.id } });
  await db.user.update({ where: { id: pm3.id },  data: { partyId: party2.id } });
  console.log("✓ Party members assigned");

  // ── Kalaams ────────────────────────────────────────────────────────────────
  const kalaams = [
    // Marasiya
    { title: "Matami",                                                    category: "MARASIYA" as const },
    { title: "Suraj se zara kehdo",                                       category: "MARASIYA" as const },
    { title: "Mazlum e Karbala ko",                                       category: "MARASIYA" as const },
    { title: "Zalzalo me duniya thi",                                     category: "MARASIYA" as const },
    { title: "Sibte rasool lut gaya",                                     category: "MARASIYA" as const },
    // Salaam
    { title: "Ye pukari zainab e khasta tan",                             category: "SALAAM" as const },
    { title: "Dekhe madina sara",                                         category: "SALAAM" as const },
    { title: "Kafla e husaini ki ye shaan he",                            category: "SALAAM" as const },
    { title: "Ran me ye sitam aale payambar pe hua he",                   category: "SALAAM" as const },
    // Madeh
    { title: "Ae shahe aali qadr",                                        category: "MADEH" as const },
    { title: "Manind andaleeb ke",                                        category: "MADEH" as const },
  ];

  const kalaamMap: Record<string, string> = {};
  for (const k of kalaams) {
    let rec = await db.kalaam.findFirst({ where: { title: k.title } });
    if (!rec) rec = await db.kalaam.create({ data: k });
    kalaamMap[k.title] = rec.id;
  }
  console.log(`✓ ${kalaams.length} kalaams seeded`);

  // ── Sample prerequisites ───────────────────────────────────────────────────
  const sampleKalaamIds = [
    kalaamMap["Matami"],
    kalaamMap["Ye pukari zainab e khasta tan"],
    kalaamMap["Ae shahe aali qadr"],
  ];
  const partyMemberIds = [pm1.id, pm2.id, pm3.id];
  for (const userId of partyMemberIds) {
    for (const kalaamId of sampleKalaamIds) {
      await db.kalaamPrerequisite.upsert({
        where: { userId_kalaamId: { userId, kalaamId } },
        create: { userId, kalaamId, lehenDone: true, hifzDone: true },
        update: { lehenDone: true, hifzDone: true },
      });
    }
  }
  console.log("✓ Sample prerequisites set (lehenDone + hifzDone) for party members");

  // ── Sample session (party-scoped to Anjuman Hussainia) ────────────────────
  const today = new Date();
  today.setHours(20, 0, 0, 0);

  const existingSession = await db.session.findFirst({
    where: { date: { gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()) } },
  });
  if (!existingSession) {
    await db.session.create({
      data: {
        date: today,
        notes: "Inaugural Anjuman Hussainia practice session",
        createdById: pc1.id,
        partyId: party1.id,
        kalaams: {
          create: sampleKalaamIds.map((kalaamId) => ({ kalaamId })),
        },
        attendees: {
          create: [pc1.id, pm1.id, pm2.id].map((userId) => ({ userId })),
        },
      },
    });
    console.log("✓ Sample session created (Anjuman Hussainia, today)");
  } else {
    console.log("ℹ  Session for today already exists — skipped");
  }

  console.log("\n✅ Seed complete!");
  console.log("   GOD:  god / admin@123");
  console.log("   MC:   husain.rassawala, husain.vohra / admin@123");
  console.log("   PC:   mufaddal.poonawala (Anjuman Hussainia), murtaza.vajihee (Markazi Party) / admin@123");
  console.log("   PM:   hakimuddin.attawala, abdulqadir.dhanerawala (Anjuman), taher.shujauddin (Markazi) / user@123");
  console.log("   IM:   ali.individual (no party) / user@123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
