import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isCoordinator } from "@/lib/permissions";
import { z } from "zod";

type Params = { params: Promise<{ id: string; recId: string }> };

const feedbackSchema = z.object({
  comment: z.string().min(1, "Comment is required").max(2000),
  ranking: z.number().int().min(1).max(5).nullable().optional(),
});

// GET — list all feedback for a recording (owner + coordinators)
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: kalaamId, recId: recordingId } = await params;
  const userId = session.user.id!;

  // Verify the recording exists and belongs to this kalaam
  const recording = await db.kalaamRecording.findUnique({
    where: { id: recordingId },
    select: { id: true, kalaamId: true, userId: true },
  });
  if (!recording || recording.kalaamId !== kalaamId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only the owner or a coordinator can view feedback
  const canView = recording.userId === userId || isCoordinator(session.user.role);
  if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const feedbacks = await db.recordingFeedback.findMany({
    where: { recordingId },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, displayName: true, role: true } } },
  });

  return NextResponse.json(feedbacks);
}

// POST — submit/update feedback for a recording (coordinators only)
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isCoordinator(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: kalaamId, recId: recordingId } = await params;
  const authorId = session.user.id!;

  const recording = await db.kalaamRecording.findUnique({
    where: { id: recordingId },
    select: { id: true, kalaamId: true },
  });
  if (!recording || recording.kalaamId !== kalaamId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const feedback = await db.recordingFeedback.upsert({
    where: { recordingId_authorId: { recordingId, authorId } },
    create: {
      recordingId,
      authorId,
      comment: parsed.data.comment,
      ranking: parsed.data.ranking ?? null,
    },
    update: {
      comment: parsed.data.comment,
      ranking: parsed.data.ranking ?? null,
    },
    include: { author: { select: { id: true, displayName: true, role: true } } },
  });

  return NextResponse.json(feedback, { status: 201 });
}

// DELETE — delete own feedback
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { recId: recordingId } = await params;
  const authorId = session.user.id!;

  const existing = await db.recordingFeedback.findUnique({
    where: { recordingId_authorId: { recordingId, authorId } },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.recordingFeedback.delete({ where: { id: existing.id } });
  return new NextResponse(null, { status: 204 });
}
