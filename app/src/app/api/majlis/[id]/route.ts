import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, Permission } from "@/lib/permissions";
import { updateMajlisSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const majlis = await db.majlis.findUnique({
    where: { id },
    include: {
      kalaams: {
        orderBy: { id: "asc" },
        include: {
          kalaam: { select: { id: true, title: true, category: true } },
          assignees: {
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  partyId: true,
                  party: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!majlis) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(majlis);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!can(session.user.role, Permission.MAJLIS_EDIT)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateMajlisSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const updated = await db.majlis.update({
    where: { id },
    data: {
      ...(parsed.data.date && { date: new Date(parsed.data.date) }),
      ...(parsed.data.occasion !== undefined && { occasion: parsed.data.occasion ?? null }),
      ...(parsed.data.notes !== undefined && { notes: parsed.data.notes ?? null }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!can(session.user.role, Permission.MAJLIS_DELETE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await db.majlis.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
