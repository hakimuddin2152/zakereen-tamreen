import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { createReciterSchema, updateReciterSchema } from "@/lib/validations";
import { isCoordinator } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!isCoordinator(session?.user?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const reciters = await db.user.findMany({
    orderBy: { displayName: "asc" },
    select: { id: true, username: true, displayName: true, party: { select: { name: true } }, role: true, grade: true, isActive: true, createdAt: true },
  });

  return NextResponse.json(reciters);
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

  const parsed = createReciterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { username, displayName, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  const hashedPassword = await hash(password, 12);
  const user = await db.user.create({
    data: { username, displayName, password: hashedPassword, role: "IM" },
    select: { id: true, username: true, displayName: true, party: { select: { name: true } }, role: true, grade: true, isActive: true, createdAt: true },
  });

  return NextResponse.json(user, { status: 201 });
}
