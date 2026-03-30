import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPresignedPdfUrl } from "@/lib/storage";

type Params = { params: Promise<{ key: string[] }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { key } = await params;
  const fileKey = key.join("/");
  if (!fileKey) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  const url = await getPresignedPdfUrl(fileKey);
  return NextResponse.json({ url });
}
