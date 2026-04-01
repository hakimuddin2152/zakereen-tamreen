import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hash } from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: process.env.DATABASE_URL?.includes("supabase") || process.env.DATABASE_URL?.includes("sslmode")
    ? { rejectUnauthorized: false }
    : undefined,
});
const adapter = new PrismaPg(pool);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = new (PrismaClient as any)({ adapter }) as InstanceType<typeof PrismaClient>;

async function main() {
  console.log("Seeding database (clean slate)…");

  // ── Clean slate ─────────────────────────────────────────────────────────────
  await db.kalaamEvalRequest.deleteMany({});
  await db.kalaamRecordingShare.deleteMany({});
  await db.kalaamRecording.deleteMany({});
  await db.kalaamPrerequisite.deleteMany({});
  await db.reciterEvaluation.deleteMany({});
  await db.sessionAttendee.deleteMany({});
  await db.sessionKalaam.deleteMany({});
  await db.session.deleteMany({});
  await db.majlisKalaamMember.deleteMany({});
  await db.majlisKalaam.deleteMany({});
  await db.majlis.deleteMany({});
  // Break circular FK (User.partyId ↔ Party.coordinatorId) before deleting
  await db.user.updateMany({ data: { partyId: null } });
  await db.party.deleteMany({});
  await db.user.deleteMany({ where: { role: { not: "GOD" } } });
  await db.kalaam.deleteMany({});
  console.log("✓ Clean slate");

  // ── Passwords ──────────────────────────────────────────────────────────────
  const godPwd    = await hash(process.env.SEED_GOD_PASSWORD    ?? "admin@123", 12);
  const mcPwd     = await hash(process.env.SEED_MC_PASSWORD     ?? "admin@123", 12);
  const pcPwd     = await hash(process.env.SEED_PC_PASSWORD     ?? "admin@123", 12);
  const memberPwd = await hash(process.env.SEED_MEMBER_PASSWORD ?? "user@123",  12);

  // ── GOD ────────────────────────────────────────────────────────────────────
  await db.user.upsert({
    where: { username: "god" },
    create: { username: "god", displayName: "Developer", password: godPwd, role: "GOD" },
    update: { password: godPwd },
  });
  console.log("✓ GOD: god");

  // ── MC ─────────────────────────────────────────────────────────────────────
  const mc1 = await db.user.create({
    data: { username: "murtaza.kareemji", displayName: "Murtaza Kareemji", password: mcPwd, role: "MC" },
  });
  const mc2 = await db.user.create({
    data: { username: "mufaddal.rasheed", displayName: "Mufaddal Rasheed", password: mcPwd, role: "MC" },
  });
  console.log("✓ MC:  murtaza.kareemji, mufaddal.rasheed");

  // ── PC ─────────────────────────────────────────────────────────────────────
  const pc_abbas   = await db.user.create({
    data: { username: "taha.fatehpurwala", displayName: "Taha Fatehpurwala", password: pcPwd, role: "PC" },
  });
  const pc_jamali  = await db.user.create({
    data: { username: "hussain.rassawala", displayName: "Hussain Rassawala", password: pcPwd, role: "PC" },
  });
  const pc_fakhri  = await db.user.create({
    data: { username: "aliasghar.dahodwala", displayName: "AliAsghar Dahodwala", password: pcPwd, role: "PC" },
  });
  console.log("✓ PC:  taha.fatehpurwala, hussain.rassawala, aliasghar.dahodwala");

  // ── PM — Hizbe Abbas ───────────────────────────────────────────────────────
  const pm_hatim    = await db.user.create({
    data: { username: "hatim.hussain",    displayName: "Hatim Hussain",    password: memberPwd, role: "PM" },
  });
  const pm_huzefa   = await db.user.create({
    data: { username: "huzefa.kareemjee", displayName: "Huzefa Kareemjee", password: memberPwd, role: "PM" },
  });
  const pm_quresh   = await db.user.create({
    data: { username: "quresh.kareemji",  displayName: "Quresh Kareemji",  password: memberPwd, role: "PM" },
  });

  // ── PM — Hizbe Jamali ──────────────────────────────────────────────────────
  const pm_hakimuddin  = await db.user.create({
    data: { username: "hakimuddin.hussain",    displayName: "Hakimuddin Hussain",    password: memberPwd, role: "PM" },
  });
  const pm_mufaddal_p  = await db.user.create({
    data: { username: "mufaddal.poonawala",    displayName: "Mufaddal Poonawala",    password: memberPwd, role: "PM" },
  });
  const pm_abdulqadir  = await db.user.create({
    data: { username: "abdulqadir.dhanerwala", displayName: "AbdulQadir Dhanerwala", password: memberPwd, role: "PM" },
  });
  const pm_husain_v    = await db.user.create({
    data: { username: "husain.vohra",          displayName: "Husain Vohra",          password: memberPwd, role: "PM" },
  });
  const pm_murtaza_v   = await db.user.create({
    data: { username: "murtaza.vajihee",       displayName: "Murtaza Vajihee",       password: memberPwd, role: "PM" },
  });

  // ── PM — Hizbe Fakhri ─────────────────────────────────────────────────────
  const pm_qusai   = await db.user.create({
    data: { username: "qusai.hariyanawala",  displayName: "Qusai Hariyanawala",  password: memberPwd, role: "PM" },
  });
  const pm_juzer   = await db.user.create({
    data: { username: "juzer.lokhandwala",   displayName: "Juzer Lokhandwala",   password: memberPwd, role: "PM" },
  });
  const pm_hasnain = await db.user.create({
    data: { username: "hasnain.bombaywala",  displayName: "Hasnain Bombaywala",  password: memberPwd, role: "PM" },
  });

  console.log("✓ PM:  10 party members created");

  // ── IM — Individual Members ────────────────────────────────────────────────
  await db.user.create({
    data: { username: "murtaza.khambati", displayName: "Murtaza Khambati", password: memberPwd, role: "IM" },
  });
  await db.user.create({
    data: { username: "taha.valijee",     displayName: "Taha Valijee",     password: memberPwd, role: "IM" },
  });
  await db.user.create({
    data: { username: "abbas.khokhar",    displayName: "Abbas Khokhar",    password: memberPwd, role: "IM" },
  });
  console.log("✓ IM:  murtaza.khambati, taha.valijee, abbas.khokhar");

  // ── Parties ────────────────────────────────────────────────────────────────
  const partyAbbas = await db.party.create({
    data: { name: "Hizbe Abbas", coordinatorId: pc_abbas.id },
  });
  const partyJamali = await db.party.create({
    data: { name: "Hizbe Jamali", coordinatorId: pc_jamali.id },
  });
  const partyFakhri = await db.party.create({
    data: { name: "Hizbe Fakhri", coordinatorId: pc_fakhri.id },
  });
  console.log("✓ Parties: Hizbe Abbas, Hizbe Jamali, Hizbe Fakhri");

  // ── Assign members to parties ─────────────────────────────────────────────
  // Hizbe Abbas: MC1, MC2, PC, 3 PMs
  for (const u of [mc1, mc2, pc_abbas, pm_hatim, pm_huzefa, pm_quresh]) {
    await db.user.update({ where: { id: u.id }, data: { partyId: partyAbbas.id } });
  }
  // Hizbe Jamali: PC + 5 PMs
  for (const u of [pc_jamali, pm_hakimuddin, pm_mufaddal_p, pm_abdulqadir, pm_husain_v, pm_murtaza_v]) {
    await db.user.update({ where: { id: u.id }, data: { partyId: partyJamali.id } });
  }
  // Hizbe Fakhri: PC + 3 PMs
  for (const u of [pc_fakhri, pm_qusai, pm_juzer, pm_hasnain]) {
    await db.user.update({ where: { id: u.id }, data: { partyId: partyFakhri.id } });
  }
  console.log("✓ Party memberships assigned");

  // ── Kalaams ────────────────────────────────────────────────────────────────
  const kalaamDefs = [
    // Marasiya
    { title: "Suraj se zara kehdo",                                     category: "MARASIYA" as const },
    { title: "Mazlum e Karbala ko",                                     category: "MARASIYA" as const },
    { title: "Zalzalo me duniya thi",                                   category: "MARASIYA" as const },
    { title: "Sibte rasool lut gaya",                                   category: "MARASIYA" as const },
    // Salaam
    { title: "Ye pukari zainab e khasta tan",                           category: "SALAAM" as const },
    { title: "Dekhe madina sara",                                       category: "SALAAM" as const },
    { title: "Kafla e husaini ki ye shaan he",                          category: "SALAAM" as const },
    { title: "Ran me ye sitam aale payambar pe hua he",                 category: "SALAAM" as const },
    // Madeh
    { title: "Ae shahe aali qadr",                                      category: "MADEH" as const },
    { title: "Manind andaleeb ke",                                      category: "MADEH" as const },
  ];

  const kalaamMap: Record<string, string> = {};
  for (const k of kalaamDefs) {
    const rec = await db.kalaam.create({ data: k });
    kalaamMap[k.title] = rec.id;
  }
  console.log(`✓ ${kalaamDefs.length} kalaams seeded (Matami removed)`);

  // ── Sample prerequisites ───────────────────────────────────────────────────
  const sampleKalaamIds = [
    kalaamMap["Ye pukari zainab e khasta tan"],
    kalaamMap["Ae shahe aali qadr"],
  ];
  for (const userId of [pm_hatim.id, pm_hakimuddin.id, pm_qusai.id]) {
    for (const kalaamId of sampleKalaamIds) {
      await db.kalaamPrerequisite.create({
        data: { userId, kalaamId, lehenDone: true, hifzDone: true },
      });
    }
  }
  console.log("✓ Sample prerequisites (lehenDone + hifzDone) for Hatim, Hakimuddin, Qusai");

  // ── Sample session ─────────────────────────────────────────────────────────
  const today = new Date();
  today.setHours(20, 0, 0, 0);
  await db.session.create({
    data: {
      date: today,
      notes: "Hizbe Abbas inaugural practice session",
      createdById: pc_abbas.id,
      partyId: partyAbbas.id,
      kalaams: { create: sampleKalaamIds.map((kalaamId) => ({ kalaamId })) },
      attendees: { create: [pc_abbas.id, pm_hatim.id, pm_huzefa.id].map((userId) => ({ userId })) },
    },
  });
  console.log("✓ Sample session created (Hizbe Abbas, today)");

  console.log("\n✅ Seed complete!");
  console.log("   GOD:  god / admin@123");
  console.log("   MC:   murtaza.kareemji, mufaddal.rasheed / admin@123");
  console.log("   PC:   taha.fatehpurwala (Hizbe Abbas), hussain.rassawala (Hizbe Jamali), aliasghar.dahodwala (Hizbe Fakhri) / admin@123");
  console.log("   PM:   hatim.hussain, huzefa.kareemjee, quresh.kareemji (Abbas) / user@123");
  console.log("         hakimuddin.hussain, mufaddal.poonawala, abdulqadir.dhanerwala, husain.vohra, murtaza.vajihee (Jamali) / user@123");
  console.log("         qusai.hariyanawala, juzer.lokhandwala, hasnain.bombaywala (Fakhri) / user@123");
  console.log("   IM:   murtaza.khambati, taha.valijee, abbas.khokhar (no party) / user@123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());

