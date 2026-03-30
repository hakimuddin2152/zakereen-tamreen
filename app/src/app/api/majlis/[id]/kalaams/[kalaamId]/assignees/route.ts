import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, Permission } from "@/lib/permissions";
import { setMajlisAssigneesSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string; kalaamId: string }> };

// PUT /api/majlis/[id]/kalaams/[kalaamId]/assignees
// MC: assign any user; PC: assign only own party members
export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  const canAssignAny = can(role, Permission.MAJLIS_ASSIGN_ANY);
  const canAssignParty = can(role, Permission.MAJLIS_ASSIGN_PARTY);

  if (!canAssignAny && !canAssignParty) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: majlisId, kalaamId } = await params;

  // Find the MajlisKalaam row
  const majlisKalaam = await db.majlisKalaam.findUnique({
    where: { majlisId_kalaamId: { majlisId, kalaamId } },
    select: { id: true },
  });
  if (!majlisKalaam) {
    return NextResponse.json({ error: "Kalaam not in this Majlis" }, { status: 404 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = setMajlisAssigneesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { userIds } = parsed.data;

  // Pre-fetch PC's party data once (reused for validation + transaction)
  let pcPartyMemberIds: string[] = [];
  if (!canAssignAny && canAssignParty) {
    const myParty = await db.party.findUnique({
      where: { coordinatorId: session.user.id },
      select: { id: true },
    });

    pcPartyMemberIds = myParty
      ? await db.user
          .findMany({ where: { partyId: myParty.id }, select: { id: true } })
          .then((u) => u.map((u) => u.id))
      : [];
    const selfAndPartyIds = [...pcPartyMemberIds, session.user.id];

    // Gate: a party/self member must already be assigned to this kalaam
    const existingAssignment = await db.majlisKalaamMember.findFirst({
      where: { majlisKalaamId: majlisKalaam.id, userId: { in: selfAndPartyIds } },
    });
    if (!existingAssignment) {
      return NextResponse.json(
        { error: "No member from your party is currently assigned to this kalaam" },
        { status: 403 }
      );
    }

    // Validate: submitted userIds must be own party members
    if (userIds.length > 0) {
      const invalidIds = userIds.filter((id) => !pcPartyMemberIds.includes(id));
      if (invalidIds.length > 0) {
        return NextResponse.json(
          { error: "Cannot assign members outside your party" },
          { status: 403 }
        );
      }
    }
  }

  const majlisKalaamId = majlisKalaam.id;

  await db.$transaction(async (tx) => {
    if (canAssignAny) {
      // MC: replace all assignees
      await tx.majlisKalaamMember.deleteMany({ where: { majlisKalaamId } });
    } else {
      // PC: only remove their own party's assignees, then re-add
      await tx.majlisKalaamMember.deleteMany({
        where: { majlisKalaamId, userId: { in: pcPartyMemberIds } },
      });
    }

    if (userIds.length > 0) {
      await tx.majlisKalaamMember.createMany({
        data: userIds.map((userId) => ({ majlisKalaamId, userId })),
        skipDuplicates: true,
      });
    }
  });

  const result = await db.majlisKalaam.findUnique({
    where: { id: majlisKalaamId },
    include: {
      assignees: {
        include: {
          user: { select: { id: true, displayName: true, party: { select: { name: true } } } },
        },
      },
    },
  });

  return NextResponse.json(result);
}
