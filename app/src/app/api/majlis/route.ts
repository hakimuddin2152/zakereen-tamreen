import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, Permission } from "@/lib/permissions";
import { createMajlisSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const majlisList = await db.majlis.findMany({
    orderBy: { date: "desc" },
    include: {
      _count: { select: { kalaams: true } },
    },
  });

  return NextResponse.json(majlisList);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!can(session.user.role, Permission.MAJLIS_CREATE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createMajlisSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const majlis = await db.majlis.create({
    data: {
      date: new Date(parsed.data.date),
      occasion: parsed.data.occasion ?? null,
      notes: parsed.data.notes ?? null,
    },
  });

  return NextResponse.json(majlis, { status: 201 });
}
