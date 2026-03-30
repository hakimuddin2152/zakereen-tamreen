import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, Permission } from "@/lib/permissions";
import { setGradeSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  const canGradeAny = can(role, Permission.MEMBER_GRADE_SET_ANY);
  const canGradeParty = can(role, Permission.MEMBER_GRADE_SET_PARTY);

  if (!canGradeAny && !canGradeParty) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // PC: can only grade members of their own party
  if (!canGradeAny) {
    const target = await db.user.findUnique({ where: { id }, select: { partyId: true } });
    if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const myParty = await db.party.findUnique({ where: { coordinatorId: session.user.id } });
    if (!myParty || myParty.id !== target.partyId) {
      return NextResponse.json({ error: "Forbidden: not your party member" }, { status: 403 });
    }
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = setGradeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const updated = await db.user.update({
    where: { id },
    data: { grade: parsed.data.grade },
    select: { id: true, displayName: true, grade: true },
  });

  return NextResponse.json(updated);
}
