import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, Permission } from "@/lib/permissions";
import { updatePartySchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!can(session.user.role, Permission.PARTY_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const party = await db.party.findUnique({
    where: { id },
    include: {
      coordinator: { select: { id: true, displayName: true, username: true, role: true } },
      members: {
        where: { isActive: true },
        orderBy: { displayName: "asc" },
        select: { id: true, displayName: true, username: true, role: true, grade: true, isActive: true },
      },
    },
  });

  if (!party) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(party);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!can(session.user.role, Permission.PARTY_EDIT)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updatePartySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  // If assigning a new coordinator, update the old coordinator's party link
  if (parsed.data.coordinatorId !== undefined) {
    const newCoordId = parsed.data.coordinatorId;
    if (newCoordId) {
      // Remove coordinatorId from any other party that currently has this user
      await db.party.updateMany({
        where: { coordinatorId: newCoordId, id: { not: id } },
        data: { coordinatorId: null },
      });
      // Set their partyId to this party
      await db.user.update({ where: { id: newCoordId }, data: { partyId: id } });
    }
  }

  const party = await db.party.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.description !== undefined && { description: parsed.data.description }),
      ...(parsed.data.coordinatorId !== undefined && { coordinatorId: parsed.data.coordinatorId }),
    },
    include: {
      coordinator: { select: { id: true, displayName: true, username: true } },
      _count: { select: { members: true } },
    },
  });

  return NextResponse.json(party);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!can(session.user.role, Permission.PARTY_DELETE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Unlink members before deletion
  await db.user.updateMany({ where: { partyId: id }, data: { partyId: null, role: "IM" } });

  await db.party.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
