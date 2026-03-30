import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createKalaamSchema } from "@/lib/validations";
import { isCoordinator } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  const kalaams = await db.kalaam.findMany({
    orderBy: { title: "asc" },
    where: category ? { category: category as "MARASIYA" | "SALAAM" | "MADEH" | "MISC" } : undefined,
    include: { _count: { select: { sessionKalaams: true } } },
  });

  return NextResponse.json(kalaams);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isCoordinator(session?.user?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createKalaamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { pdfLink, ...rest } = parsed.data;
  const kalaam = await db.kalaam.create({
    data: { ...rest, pdfLink: pdfLink || null },
  });
  return NextResponse.json(kalaam, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!isCoordinator(session?.user?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const linked = await db.sessionKalaam.count({ where: { kalaamId: id } });
  if (linked > 0) {
    return NextResponse.json(
      { error: `Cannot delete — used in ${linked} session${linked !== 1 ? "s" : ""}` },
      { status: 409 }
    );
  }

  await db.kalaam.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
