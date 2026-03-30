import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, Permission } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!can(session.user.role, Permission.MEMBER_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch all active members with their party info
  const members = await db.user.findMany({
    where: { role: { not: "GOD" }, isActive: true },
    orderBy: { displayName: "asc" },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      grade: true,
      isActive: true,
      createdAt: true,
      partyId: true,
      party: { select: { id: true, name: true } },
      _count: { select: { attendances: true, evaluations: true } },
    },
  });

  // Group by party
  const parties = await db.party.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const grouped = parties.map((p) => ({
    party: p,
    members: members.filter((m) => m.partyId === p.id),
  }));

  const individuals = members.filter((m) => !m.partyId);

  return NextResponse.json({ grouped, individuals });
}
