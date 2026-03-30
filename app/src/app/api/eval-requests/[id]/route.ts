import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, Permission } from "@/lib/permissions";
import { reviewEvalRequestSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  const canReviewAny = can(role, Permission.EVAL_REQUEST_REVIEW_ANY);
  const canReviewParty = can(role, Permission.EVAL_REQUEST_REVIEW_PARTY);

  if (!canReviewAny && !canReviewParty) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const evalReq = await db.kalaamEvalRequest.findUnique({
    where: { id },
    include: { user: { select: { partyId: true } } },
  });
  if (!evalReq) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // PC scope: can only evaluate their party's members
  if (!canReviewAny) {
    const myParty = await db.party.findUnique({
      where: { coordinatorId: session.user.id },
      select: { id: true },
    });
    if (!myParty || evalReq.user.partyId !== myParty.id) {
      return NextResponse.json({ error: "Forbidden: not your party member" }, { status: 403 });
    }
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = reviewEvalRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const updated = await db.kalaamEvalRequest.update({
    where: { id },
    data: {
      status: parsed.data.status,
      evaluatorId: session.user.id,
      evaluatedAt: new Date(),
      ranking: parsed.data.ranking ?? null,
      voiceRange: parsed.data.voiceRange ?? null,
      evalNotes: parsed.data.evalNotes ?? null,
    },
  });

  return NextResponse.json(updated);
}
