import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; recId: string; userId: string }> };

// DELETE — unshare recording from a specific user
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { recId, userId } = await params;

  const recording = await db.kalaamRecording.findUnique({ where: { id: recId } });
  if (!recording) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only recording owner can unshare
  if (recording.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.kalaamRecordingShare.deleteMany({
    where: { recordingId: recId, sharedWithId: userId },
  });

  return new NextResponse(null, { status: 204 });
}
