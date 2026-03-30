import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/my-majlis
// Returns all Majlis events where the current user is assigned to at least one kalaam
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // Find all MajlisKalaamMember rows for this user, then get related Majlis
  const assignments = await db.majlisKalaamMember.findMany({
    where: { userId },
    include: {
      majlisKalaam: {
        include: {
          majlis: {
            select: { id: true, date: true, occasion: true, notes: true },
          },
          kalaam: {
            select: { id: true, title: true },
          },
        },
      },
    },
  });

  // Group by majlis
  const majlisMap = new Map<
    string,
    { id: string; date: string; occasion: string | null; notes: string | null; kalaams: { id: string; title: string }[] }
  >();

  for (const a of assignments) {
    const mk = a.majlisKalaam;
    const m = mk.majlis;
    const k = mk.kalaam;
    if (!majlisMap.has(m.id)) {
      majlisMap.set(m.id, {
        id: m.id,
        date: m.date.toISOString(),
        occasion: m.occasion ?? null,
        notes: m.notes ?? null,
        kalaams: [],
      });
    }
    majlisMap.get(m.id)!.kalaams.push({ id: k.id, title: k.title });
  }

  const now = new Date();
  const all = Array.from(majlisMap.values());

  const upcoming = all
    .filter((m) => new Date(m.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const past = all
    .filter((m) => new Date(m.date) < now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({ upcoming, past });
}
