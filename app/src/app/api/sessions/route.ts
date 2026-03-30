import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createSessionSchema } from "@/lib/validations";
import { can, Permission } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, id: userId, partyId } = session.user;

  // Scoped visibility
  let where: Record<string, unknown> = {};
  if (can(role, Permission.SESSION_VIEW_ALL)) {
    where = {};
  } else if (can(role, Permission.SESSION_VIEW_PARTY)) {
    where = {
      OR: [
        { partyId: partyId ?? "__none__" },
        { attendees: { some: { userId } } },
      ],
    };
  } else {
    where = { attendees: { some: { userId } } };
  }

  const sessions = await db.session.findMany({
    where,
    orderBy: { date: "desc" },
    include: {
      kalaams: { include: { kalaam: { select: { id: true, title: true, category: true } } } },
      party: { select: { id: true, name: true } },
      _count: { select: { attendees: true } },
    },
  });

  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  const canCreateAny = can(role, Permission.SESSION_CREATE_ANY);
  const canCreateParty = can(role, Permission.SESSION_CREATE_PARTY);

  if (!canCreateAny && !canCreateParty) {
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

  // PC: determine their party to tag the session
  let sessionPartyId: string | null = null;
  if (canCreateParty && !canCreateAny) {
    const myParty = await db.party.findUnique({ where: { coordinatorId: session.user.id }, select: { id: true } });
    sessionPartyId = myParty?.id ?? null;
  }

  // Check prerequisites
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
        missingPrereqs.push(
          `${user?.displayName ?? userId} has not completed prerequisites for "${kalaam?.title ?? kalaamId}"`
        );
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
      createdById: session.user.id,
      partyId: sessionPartyId,
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
      party: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(newSession, { status: 201 });
}

