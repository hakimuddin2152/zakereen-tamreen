import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isCoordinator } from "@/lib/permissions";
import { z } from "zod";

type Params = { params: Promise<{ id: string; recId: string }> };

const feedbackSchema = z.object({
  comment: z.string().max(2000).nullable().optional(),
  ranking: z.number().int().min(1).max(5).nullable().optional(),
  audioFileKey: z.string().max(500).nullable().optional(),
  audioFileName: z.string().max(200).nullable().optional(),
}).refine((d) => (d.comment?.trim() || d.audioFileKey), {
  message: "Provide a comment or an audio clip",
});

// GET — list all feedback for a recording (owner + coordinators)
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: kalaamId, recId: recordingId } = await params;
  const userId = session.user.id!;

  const recording = await db.kalaamRecording.findUnique({
    where: { id: recordingId },
    select: { id: true, kalaamId: true, userId: true },
  });
  if (!recording || recording.kalaamId !== kalaamId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Owner or coordinator can view feedback
  const canView = recording.userId === userId || isCoordinator(session.user.role);
  if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const feedbacks = await db.recordingFeedback.findMany({
    where: { recordingId },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, displayName: true, role: true } } },
  });

  return NextResponse.json(feedbacks);
}

// POST — append a new feedback message (coordinators only)
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

  const feedback = await db.recordingFeedback.create({
    data: {
      recordingId,
      authorId,
      comment: parsed.data.comment ?? null,
      ranking: parsed.data.ranking ?? null,
      audioFileKey: parsed.data.audioFileKey ?? null,
      audioFileName: parsed.data.audioFileName ?? null,
    },
    include: { author: { select: { id: true, displayName: true, role: true } } },
  });

  return NextResponse.json(feedback, { status: 201 });
}

// DELETE — delete a specific feedback entry (own only, by ?feedbackId=...)
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { recId: recordingId } = await params;
  const authorId = session.user.id!;
  const feedbackId = new URL(req.url).searchParams.get("feedbackId");

  if (!feedbackId) return NextResponse.json({ error: "feedbackId required" }, { status: 400 });

  const existing = await db.recordingFeedback.findUnique({
    where: { id: feedbackId },
    select: { id: true, authorId: true, recordingId: true },
  });
  if (!existing || existing.recordingId !== recordingId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // Author can always delete; coordinators can delete any feedback
  if (existing.authorId !== authorId && !isCoordinator(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.recordingFeedback.delete({ where: { id: feedbackId } });
  return new NextResponse(null, { status: 204 });
}
