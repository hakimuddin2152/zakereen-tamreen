import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { updatePrerequisiteSchema } from "@/lib/validations";

/**
 * GET /api/prerequisites?kalaamId=…
 * Returns the current user's prerequisite status for a kalaam (or all kalaams).
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const kalaamId = new URL(req.url).searchParams.get("kalaamId");

  if (kalaamId) {
    const prereq = await db.kalaamPrerequisite.findUnique({
      where: { userId_kalaamId: { userId, kalaamId } },
    });
    return NextResponse.json(prereq ?? { userId, kalaamId, lehenDone: false, hifzDone: false });
  }

  const all = await db.kalaamPrerequisite.findMany({ where: { userId } });
  return NextResponse.json(all);
}

/**
 * PATCH /api/prerequisites
 * Upsert lehenDone / hifzDone for the current user's kalaam prerequisite.
 * Members can only update their own. Admins/God can update for any user via ?userId=…
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isPrivileged = session.user.role === "ADMIN" || session.user.role === "GOD";
  const targetUserId =
    isPrivileged
      ? (new URL(req.url).searchParams.get("userId") ?? session.user.id)
      : session.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updatePrerequisiteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { kalaamId, lehenDone, hifzDone } = parsed.data;

  const prereq = await db.kalaamPrerequisite.upsert({
    where: { userId_kalaamId: { userId: targetUserId, kalaamId } },
    create: {
      userId: targetUserId,
      kalaamId,
      lehenDone: lehenDone ?? false,
      hifzDone: hifzDone ?? false,
    },
    update: {
      ...(lehenDone !== undefined ? { lehenDone } : {}),
      ...(hifzDone !== undefined ? { hifzDone } : {}),
    },
  });

  return NextResponse.json(prereq);
}
