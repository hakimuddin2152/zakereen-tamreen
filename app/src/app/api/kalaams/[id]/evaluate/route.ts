import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isCoordinator } from "@/lib/permissions";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const standaloneEvalSchema = z.object({
  userId: z.string().cuid("Invalid userId"),
  ranking: z.number().int().min(1).max(5).nullable().optional(),
  voiceRange: z.string().max(100).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

// POST /api/kalaams/:id/evaluate — coordinator creates/updates a standalone (non-session) eval
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isCoordinator(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: kalaamId } = await params;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = standaloneEvalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { userId, ranking, voiceRange, notes } = parsed.data;

  // Verify kalaam exists
  const kalaam = await db.kalaam.findUnique({ where: { id: kalaamId }, select: { id: true } });
  if (!kalaam) return NextResponse.json({ error: "Kalaam not found" }, { status: 404 });

  // PC: can only evaluate members in their own party
  if (session.user.role === "PC") {
    const myParty = await db.party.findUnique({
      where: { coordinatorId: session.user.id },
      select: { id: true },
    });
    const member = await db.user.findUnique({ where: { id: userId }, select: { partyId: true } });
    if (!myParty || member?.partyId !== myParty.id) {
      return NextResponse.json({ error: "Forbidden: not your party member" }, { status: 403 });
    }
  }

  // Upsert: delete existing standalone eval for this userId+kalaamId, then create
  await db.reciterEvaluation.deleteMany({
    where: { sessionId: null, userId, kalaamId },
  });

  const evaluation = await db.reciterEvaluation.create({
    data: {
      sessionId: null,
      userId,
      kalaamId,
      ranking: ranking ?? null,
      voiceRange: voiceRange ?? null,
      notes: notes ?? null,
    },
  });

  return NextResponse.json(evaluation, { status: 201 });
}

// GET /api/kalaams/:id/evaluate?userId= — fetch standalone eval for a member
export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: kalaamId } = await params;
  const userId = new URL(req.url).searchParams.get("userId") ?? session.user.id;

  // Members can only fetch their own; coordinators can fetch anyone
  if (userId !== session.user.id && !isCoordinator(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const evaluation = await db.reciterEvaluation.findFirst({
    where: { sessionId: null, userId, kalaamId },
  });

  return NextResponse.json(evaluation ?? null);
}
