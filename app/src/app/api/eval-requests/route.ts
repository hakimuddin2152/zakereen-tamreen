import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, Permission } from "@/lib/permissions";
import { createEvalRequestSchema } from "@/lib/validations";

// GET /api/eval-requests — MC: all pending; PC: own party pending
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  const canReviewAny = can(role, Permission.EVAL_REQUEST_REVIEW_ANY);
  const canReviewParty = can(role, Permission.EVAL_REQUEST_REVIEW_PARTY);

  if (!canReviewAny && !canReviewParty) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let where: Record<string, unknown> = { status: "PENDING" };

  if (!canReviewAny && canReviewParty) {
    // PC: only their party's PM requests
    const myParty = await db.party.findUnique({
      where: { coordinatorId: session.user.id },
      select: { id: true },
    });
    where = {
      status: "PENDING",
      user: { partyId: myParty?.id ?? "__none__" },
    };
  }

  const requests = await db.kalaamEvalRequest.findMany({
    where,
    orderBy: { requestedAt: "asc" },
    include: {
      user: { select: { id: true, displayName: true, party: { select: { name: true } } } },
      kalaam: { select: { id: true, title: true, category: true } },
    },
  });

  return NextResponse.json(requests);
}

// POST /api/eval-requests — PM / IM: submit a new eval request
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!can(session.user.role, Permission.EVAL_REQUEST_SUBMIT)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createEvalRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const userId = session.user.id;
  const { kalaamId, notes } = parsed.data;

  // Verify prerequisites are met
  const prereq = await db.kalaamPrerequisite.findUnique({
    where: { userId_kalaamId: { userId, kalaamId } },
  });
  if (!prereq || !prereq.lehenDone || !prereq.hifzDone) {
    return NextResponse.json(
      { error: "Prerequisites not complete (lehenDone and hifzDone required)" },
      { status: 422 }
    );
  }

  // Must have at least one recording — waived for PC and MC (coordinators)
  const role = session.user.role;
  const coordRoles = ["PC", "MC", "GOD"];
  if (!coordRoles.includes(role)) {
    const recordingCount = await db.kalaamRecording.count({ where: { userId, kalaamId } });
    if (recordingCount === 0) {
      return NextResponse.json(
        { error: "At least one recording is required before requesting evaluation" },
        { status: 422 }
      );
    }
  }

  const request = await db.kalaamEvalRequest.create({
    data: { userId, kalaamId, notes: notes ?? null, status: "PENDING" },
    include: {
      kalaam: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json(request, { status: 201 });
}
