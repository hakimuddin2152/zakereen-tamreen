import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

type Params = { params: Promise<{ id: string; recId: string }> };

const shareSchema = z.object({ userIds: z.array(z.string().cuid()).min(1) });

// POST — share a recording with one or more users
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { recId } = await params;

  const recording = await db.kalaamRecording.findUnique({ where: { id: recId } });
  if (!recording) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only recording owner can share
  if (recording.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = shareSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  // Upsert shares (idempotent)
  await db.kalaamRecordingShare.createMany({
    data: parsed.data.userIds.map((userId) => ({ recordingId: recId, sharedWithId: userId })),
    skipDuplicates: true,
  });

  return NextResponse.json({ success: true });
}
