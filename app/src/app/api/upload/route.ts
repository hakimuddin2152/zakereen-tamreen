import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPresignedUploadUrl, validateAudioUpload } from "@/lib/storage";
import { uploadRequestSchema } from "@/lib/validations";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  const { contentType, contentLength, sessionId, userId } = parsed.data;

  const validationError = validateAudioUpload(contentType, contentLength);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const ext = contentType.split("/")[1]?.replace("mpeg", "mp3") ?? "audio";
  const fileKey = `sessions/${sessionId}/${userId}/${randomUUID()}.${ext}`;
  const uploadUrl = await getPresignedUploadUrl(fileKey, contentType);

  return NextResponse.json({ uploadUrl, fileKey });
}
