import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateKalaamSchema } from "@/lib/validations";
import { isCoordinator } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const kalaam = await db.kalaam.findUnique({
    where: { id },
    include: {
      sessionKalaams: {
        include: {
          session: {
            include: { _count: { select: { attendees: true } } },
          },
        },
        orderBy: { session: { date: "desc" } },
      },
    },
  });

  if (!kalaam) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(kalaam);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  const role = session?.user?.role;
  if (!isCoordinator(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateKalaamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { pdfLink, pdfFileKey, pdfFileName, audioFileKey, audioFileName, ...rest } = parsed.data;
  const updated = await db.kalaam.update({
    where: { id },
    data: {
      ...rest,
      ...(pdfLink !== undefined ? { pdfLink: pdfLink || null } : {}),
      ...(pdfFileKey !== undefined ? { pdfFileKey: pdfFileKey ?? null } : {}),
      ...(pdfFileName !== undefined ? { pdfFileName: pdfFileName ?? null } : {}),
      ...(audioFileKey !== undefined ? { audioFileKey: audioFileKey ?? null } : {}),
      ...(audioFileName !== undefined ? { audioFileName: audioFileName ?? null } : {}),
    },
  });
  return NextResponse.json(updated);
}
