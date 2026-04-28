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

  // Verify the target user exists
  const member = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  try {
    // Upsert: delete existing standalone eval for this userId+kalaamId, then create
    await db.reciterEvaluation.deleteMany({
      where: { sessionId: { equals: null }, userId, kalaamId },
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

    // If a PENDING eval request exists for this member+kalaam, mark it EVALUATED
    // Verify the coordinator's id is a real DB record before using it as FK
    const coordinatorId = session.user.id
      ? (await db.user.findUnique({ where: { id: session.user.id }, select: { id: true } }))?.id ?? null
      : null;
    await db.kalaamEvalRequest.updateMany({
      where: { userId, kalaamId, status: "PENDING" },
      data: {
        status: "EVALUATED",
        evaluatorId: coordinatorId,
        evaluatedAt: new Date(),
        ranking: ranking ?? null,
        voiceRange: voiceRange ?? null,
        evalNotes: notes ?? null,
      },
    }).catch((e: unknown) => {
      // Non-fatal — evaluation itself is already saved
      console.warn("[evaluate POST] updateMany eval request failed:", e);
    });

    return NextResponse.json(evaluation, { status: 201 });
  } catch (err) {
    console.error("[evaluate POST]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save evaluation" },
      { status: 500 }
    );
  }
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
