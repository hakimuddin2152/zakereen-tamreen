import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPresignedPlaybackUrl } from "@/lib/storage";

type Params = { params: Promise<{ key: string[] }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { key } = await params;
  // key is a catch-all array — join to reconstruct the full S3 key
  const fileKey = key.join("/");
  if (!fileKey) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  const url = await getPresignedPlaybackUrl(fileKey);
  return NextResponse.json({ url });
}
