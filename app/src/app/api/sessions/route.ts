import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createSessionSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessions = await db.session.findMany({
    orderBy: { date: "desc" },
    include: {
      kalaams: { include: { kalaam: { select: { id: true, title: true, category: true } } } },
      _count: { select: { attendees: true } },
    },
  });

  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "GOD") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { date, kalaamIds, notes, attendeeIds } = parsed.data;

  // Verify all kalaam IDs exist
  const kalaams = await db.kalaam.findMany({ where: { id: { in: kalaamIds } }, select: { id: true } });
  if (kalaams.length !== kalaamIds.length) {
    return NextResponse.json({ error: "One or more kalaams not found" }, { status: 422 });
  }

  // Check prerequisites: each attendee must have lehenDone + hifzDone for every kalaam
  const missingPrereqs: string[] = [];
  for (const userId of attendeeIds) {
    for (const kalaamId of kalaamIds) {
      const prereq = await db.kalaamPrerequisite.findUnique({
        where: { userId_kalaamId: { userId, kalaamId } },
        select: { lehenDone: true, hifzDone: true },
      });
      if (!prereq || !prereq.lehenDone || !prereq.hifzDone) {
        const user = await db.user.findUnique({ where: { id: userId }, select: { displayName: true } });
        const kalaam = await db.kalaam.findUnique({ where: { id: kalaamId }, select: { title: true } });
        missingPrereqs.push(`${user?.displayName ?? userId} has not completed prerequisites for "${kalaam?.title ?? kalaamId}"`);
      }
    }
  }
  if (missingPrereqs.length > 0) {
    return NextResponse.json({ error: "Prerequisites not met", details: missingPrereqs }, { status: 422 });
  }

  const newSession = await db.session.create({
    data: {
      date: new Date(date),
      notes: notes ?? null,
      kalaams: {
        create: kalaamIds.map((kalaamId) => ({ kalaamId })),
      },
      attendees: {
        create: attendeeIds.map((userId) => ({ userId })),
      },
    },
    include: {
      kalaams: { include: { kalaam: true } },
      attendees: { include: { user: { select: { id: true, displayName: true } } } },
    },
  });

  return NextResponse.json(newSession, { status: 201 });
}
