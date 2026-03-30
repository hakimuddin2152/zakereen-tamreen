import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPresignedUploadUrl, validateAudioUpload, validatePdfUpload } from "@/lib/storage";
import { uploadRequestSchema } from "@/lib/validations";
import { randomUUID } from "crypto";
import { isCoordinator } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = uploadRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { contentType, contentLength, context, sessionId, userId, kalaamId } = parsed.data;
  const role = session.user.role;

  // Members can only upload their own practice recordings
  if (!isCoordinator(role) && context !== "kalaamRecording") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const validationError =
    context === "kalaamPdf"
      ? validatePdfUpload(contentType, contentLength)
      : validateAudioUpload(contentType, contentLength);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const ext = contentType.split("/")[1]?.replace("mpeg", "mp3") ?? "audio";
  const currentUserId = session.user.id!;
  let fileKey: string;

  if (context === "kalaam" && kalaamId) {
    fileKey = `kalaams/${kalaamId}/${randomUUID()}.${ext}`;
  } else if (context === "session" && sessionId && userId) {
    fileKey = `sessions/${sessionId}/${userId}/${randomUUID()}.${ext}`;
  } else if (context === "kalaamRecording" && kalaamId) {
    fileKey = `recordings/${kalaamId}/${currentUserId}/${randomUUID()}.${ext}`;
  } else if (context === "kalaamPdf" && kalaamId) {
    fileKey = `pdf/${kalaamId}/${randomUUID()}.pdf`;
  } else {
    return NextResponse.json({ error: "Invalid upload context" }, { status: 400 });
  }

  const uploadUrl = await getPresignedUploadUrl(fileKey, contentType);
  return NextResponse.json({ uploadUrl, fileKey });
}
