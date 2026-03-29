import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { upsertEvaluationSchema } from "@/lib/validations";
import { deleteAudioFile } from "@/lib/storage";

type Params = { params: Promise<{ id: string; userId: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "GOD") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: sessionId, userId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = upsertEvaluationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  // Make sure the user attended this session
  const attendee = await db.sessionAttendee.findUnique({
    where: { sessionId_userId: { sessionId, userId } },
  });
  if (!attendee) {
    return NextResponse.json({ error: "User is not an attendee of this session" }, { status: 404 });
  }

  const evaluation = await db.reciterEvaluation.upsert({
    where: { sessionId_userId: { sessionId, userId } },
    create: { sessionId, userId, ...parsed.data },
    update: parsed.data,
  });

  return NextResponse.json(evaluation);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "GOD") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: sessionId, userId } = await params;

  const evaluation = await db.reciterEvaluation.findUnique({
    where: { sessionId_userId: { sessionId, userId } },
  });

  if (!evaluation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (evaluation.audioFileKey) {
    await deleteAudioFile(evaluation.audioFileKey);
  }

  await db.reciterEvaluation.delete({
    where: { sessionId_userId: { sessionId, userId } },
  });

  return NextResponse.json({ success: true });
}
