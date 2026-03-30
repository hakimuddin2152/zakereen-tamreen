import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isCoordinator } from "@/lib/permissions";
import { deleteAudioFile } from "@/lib/storage";
import { saveRecordingSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

const MAX_RECORDINGS = 3;

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: kalaamId } = await params;
  const userId = session.user.id!;

  const recordings = await db.kalaamRecording.findMany({
    where: { userId, kalaamId },
    orderBy: { createdAt: "desc" },
    take: MAX_RECORDINGS,
  });

  return NextResponse.json(recordings);
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: kalaamId } = await params;
  const userId = session.user.id!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = saveRecordingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  // Verify kalaam exists
  const kalaam = await db.kalaam.findUnique({ where: { id: kalaamId }, select: { id: true } });
  if (!kalaam) return NextResponse.json({ error: "Kalaam not found" }, { status: 404 });

  // Save the new recording
  const recording = await db.kalaamRecording.create({
    data: { userId, kalaamId, fileKey: parsed.data.fileKey, fileName: parsed.data.fileName },
  });

  // Trim to last MAX_RECORDINGS — delete oldest ones from DB and S3
  const all = await db.kalaamRecording.findMany({
    where: { userId, kalaamId },
    orderBy: { createdAt: "desc" },
  });

  if (all.length > MAX_RECORDINGS) {
    const toDelete = all.slice(MAX_RECORDINGS);
    for (const old of toDelete) {
      await deleteAudioFile(old.fileKey).catch(() => {}); // best-effort S3 delete
      await db.kalaamRecording.delete({ where: { id: old.id } });
    }
  }

  return NextResponse.json(recording, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: kalaamId } = await params;
  const userId = session.user.id!;
  const role = session.user.role;
  const recordingId = new URL(req.url).searchParams.get("recordingId");
  if (!recordingId) return NextResponse.json({ error: "recordingId required" }, { status: 400 });

  const recording = await db.kalaamRecording.findUnique({ where: { id: recordingId } });
  if (!recording || recording.kalaamId !== kalaamId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only owner or admin can delete
  if (recording.userId !== userId && !isCoordinator(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteAudioFile(recording.fileKey).catch(() => {});
  await db.kalaamRecording.delete({ where: { id: recordingId } });

  return NextResponse.json({ success: true });
}
