import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, Permission } from "@/lib/permissions";
import { addPartyMemberSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

// POST /api/parties/[id]/members — add a user to this party
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  const { id: partyId } = await params;

  // MC can add to any party; PC can only add to their own party
  const canAddAny = can(role, Permission.PARTY_ASSIGN_ANY_MEMBER);
  const canAddOwn = can(role, Permission.PARTY_ASSIGN_OWN_MEMBER);

  if (!canAddAny && !canAddOwn) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // PC scope: must be their own party
  if (!canAddAny) {
    const myParty = await db.party.findUnique({ where: { coordinatorId: session.user.id } });
    if (!myParty || myParty.id !== partyId) {
      return NextResponse.json({ error: "Forbidden: not your party" }, { status: 403 });
    }
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = addPartyMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const target = await db.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Assign to party. If IM, promote to PM automatically.
  const newRole = target.role === "IM" ? "PM" : target.role;

  const updated = await db.user.update({
    where: { id: parsed.data.userId },
    data: { partyId, role: newRole },
    select: { id: true, displayName: true, role: true, partyId: true },
  });

  return NextResponse.json(updated);
}

// DELETE /api/parties/[id]/members/[userId] — remove member from party
// This is implemented as a sub-path, so we accept userId via query param here
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  const { id: partyId } = await params;
  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const canRemoveAny = can(role, Permission.PARTY_ASSIGN_ANY_MEMBER);
  const canRemoveOwn = can(role, Permission.PARTY_ASSIGN_OWN_MEMBER);

  if (!canRemoveAny && !canRemoveOwn) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!canRemoveAny) {
    const myParty = await db.party.findUnique({ where: { coordinatorId: session.user.id } });
    if (!myParty || myParty.id !== partyId) {
      return NextResponse.json({ error: "Forbidden: not your party" }, { status: 403 });
    }
  }

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.partyId !== partyId) {
    return NextResponse.json({ error: "User not in this party" }, { status: 404 });
  }

  // Removing from party: revert PM → IM if they were promoted
  const revertedRole = target.role === "PM" ? "IM" : target.role;

  await db.user.update({
    where: { id: userId },
    data: { partyId: null, role: revertedRole },
  });

  return new NextResponse(null, { status: 204 });
}
