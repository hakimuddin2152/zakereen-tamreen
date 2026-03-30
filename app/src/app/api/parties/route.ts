import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, Permission } from "@/lib/permissions";
import { createPartySchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (!can(role, Permission.PARTY_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parties = await db.party.findMany({
    orderBy: { name: "asc" },
    include: {
      coordinator: { select: { id: true, displayName: true, username: true } },
      _count: { select: { members: true } },
    },
  });

  return NextResponse.json(parties);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!can(session.user.role, Permission.PARTY_CREATE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createPartySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const existing = await db.party.findUnique({ where: { name: parsed.data.name } });
  if (existing) {
    return NextResponse.json({ error: "Party name already exists" }, { status: 409 });
  }

  const party = await db.party.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    },
    include: {
      coordinator: { select: { id: true, displayName: true, username: true } },
      _count: { select: { members: true } },
    },
  });

  return NextResponse.json(party, { status: 201 });
}
