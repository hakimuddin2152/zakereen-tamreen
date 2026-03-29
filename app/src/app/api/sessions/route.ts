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
      kalaam: { select: { title: true } },
      lehenType: { select: { name: true } },
      _count: { select: { attendees: true } },
    },
  });

  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
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

  const { date, kalaamId, kalaamTitle, lehenTypeId, lehenNotes, notes, attendeeIds } = parsed.data;

  // Resolve kalaam — use existing or create new
  let resolvedKalaamId = kalaamId;
  if (!resolvedKalaamId && kalaamTitle) {
    const kalaam = await db.kalaam.create({ data: { title: kalaamTitle } });
    resolvedKalaamId = kalaam.id;
  }
  if (!resolvedKalaamId) {
    return NextResponse.json({ error: "kalaamId or kalaamTitle required" }, { status: 422 });
  }

  const newSession = await db.session.create({
    data: {
      date: new Date(date),
      kalaamId: resolvedKalaamId,
      lehenTypeId: lehenTypeId ?? null,
      lehenNotes: lehenNotes ?? null,
      notes: notes ?? null,
      attendees: {
        create: attendeeIds.map((userId) => ({ userId })),
      },
    },
    include: {
      kalaam: true,
      lehenType: true,
      attendees: { include: { user: { select: { id: true, displayName: true } } } },
    },
  });

  return NextResponse.json(newSession, { status: 201 });
}
