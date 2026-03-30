import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { resetPasswordSchema } from "@/lib/validations";
import { can, isCoordinator, Permission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  const role = session?.user?.role ?? "";
  if (!isCoordinator(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // PC can only reset passwords for their own party members
  if (!can(role, Permission.PARTY_CREATE)) {
    const target = await db.user.findUnique({ where: { id }, select: { partyId: true } });
    const myParty = await db.party.findUnique({
      where: { coordinatorId: session!.user!.id },
      select: { id: true },
    });
    if (!myParty || target?.partyId !== myParty.id) {
      return NextResponse.json({ error: "Forbidden: not your party member" }, { status: 403 });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const hashedPassword = await hash(parsed.data.password, 12);
  await db.user.update({ where: { id }, data: { password: hashedPassword } });

  return NextResponse.json({ success: true });
}
