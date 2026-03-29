import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateSessionSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const dbSession = await db.session.findUnique({
    where: { id },
    include: {
      kalaam: true,
      lehenType: true,
      attendees: { include: { user: { select: { id: true, displayName: true } } } },
      evaluations: true,
    },
  });

  if (!dbSession) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(dbSession);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { date, kalaamId, kalaamTitle, lehenTypeId, lehenNotes, notes, attendeeIds } = parsed.data;

  let resolvedKalaamId = kalaamId;
  if (!resolvedKalaamId && kalaamTitle) {
    const kalaam = await db.kalaam.create({ data: { title: kalaamTitle } });
    resolvedKalaamId = kalaam.id;
  }

  const updateData: Record<string, unknown> = {};
  if (date) updateData.date = new Date(date);
  if (resolvedKalaamId) updateData.kalaamId = resolvedKalaamId;
  if (lehenTypeId !== undefined) updateData.lehenTypeId = lehenTypeId ?? null;
  if (lehenNotes !== undefined) updateData.lehenNotes = lehenNotes ?? null;
  if (notes !== undefined) updateData.notes = notes ?? null;

  const updated = await db.$transaction(async (tx) => {
    if (attendeeIds) {
      await tx.sessionAttendee.deleteMany({ where: { sessionId: id } });
      await tx.sessionAttendee.createMany({
        data: attendeeIds.map((userId) => ({ sessionId: id, userId })),
      });
    }
    return tx.session.update({
      where: { id },
      data: updateData,
      include: {
        kalaam: true,
        lehenType: true,
        attendees: { include: { user: { select: { id: true, displayName: true } } } },
      },
    });
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await db.session.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
