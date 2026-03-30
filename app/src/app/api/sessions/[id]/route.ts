import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateSessionSchema } from "@/lib/validations";
import { isCoordinator } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const dbSession = await db.session.findUnique({
    where: { id },
    include: {
      kalaams: { include: { kalaam: true } },
      attendees: { include: { user: { select: { id: true, displayName: true } } } },
      evaluations: true,
    },
  });

  if (!dbSession) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(dbSession);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!isCoordinator(session?.user?.role)) {
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

  const { date, kalaamIds, notes, attendeeIds } = parsed.data;

  const updated = await db.$transaction(async (tx) => {
    if (kalaamIds) {
      await tx.sessionKalaam.deleteMany({ where: { sessionId: id } });
      await tx.sessionKalaam.createMany({
        data: kalaamIds.map((kalaamId) => ({ sessionId: id, kalaamId })),
      });
    }
    if (attendeeIds) {
      await tx.sessionAttendee.deleteMany({ where: { sessionId: id } });
      await tx.sessionAttendee.createMany({
        data: attendeeIds.map((userId) => ({ sessionId: id, userId })),
      });
    }
    const updateData: Record<string, unknown> = {};
    if (date) updateData.date = new Date(date);
    if (notes !== undefined) updateData.notes = notes ?? null;
    return tx.session.update({
      where: { id },
      data: updateData,
      include: {
        kalaams: { include: { kalaam: true } },
        attendees: { include: { user: { select: { id: true, displayName: true } } } },
      },
    });
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!isCoordinator(session?.user?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await db.session.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
