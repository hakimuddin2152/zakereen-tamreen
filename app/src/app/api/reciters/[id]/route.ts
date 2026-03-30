import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { updateReciterSchema, resetPasswordSchema } from "@/lib/validations";
import { can, isCoordinator, Permission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

/** Returns the target user's partyId. Used for PC scope checks. */
async function getTargetPartyId(id: string): Promise<string | null> {
  const u = await db.user.findUnique({ where: { id }, select: { partyId: true } });
  return u?.partyId ?? null;
}

/** Returns the PC's own party id. */
async function getPCPartyId(coordinatorId: string): Promise<string | null> {
  const p = await db.party.findUnique({ where: { coordinatorId }, select: { id: true } });
  return p?.id ?? null;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Members can only access their own profile
  const role = session.user.role;
  if (!isCoordinator(role) && session.user.id !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true, username: true, displayName: true, party: { select: { name: true } }, role: true,
      grade: true, isActive: true, createdAt: true,
      evaluations: {
        orderBy: { session: { date: "desc" } },
        include: {
          session: {
            include: {
              kalaams: { include: { kalaam: { select: { id: true, title: true, category: true } } } },
            },
          },
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  const role = session?.user?.role ?? "";
  if (!isCoordinator(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // PC can only update members of their own party
  if (!can(role, Permission.PARTY_CREATE)) {
    const [targetPartyId, myPartyId] = await Promise.all([
      getTargetPartyId(id),
      getPCPartyId(session!.user!.id),
    ]);
    if (!myPartyId || targetPartyId !== myPartyId) {
      return NextResponse.json({ error: "Forbidden: not your party member" }, { status: 403 });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateReciterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const updated = await db.user.update({
    where: { id },
    data: parsed.data,
    select: { id: true, username: true, displayName: true, party: { select: { name: true } }, role: true, grade: true, isActive: true },
  });

  return NextResponse.json(updated);
}
