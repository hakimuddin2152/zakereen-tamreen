import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, Permission } from "@/lib/permissions";
import { setMajlisSetlistSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

// PUT /api/majlis/[id]/kalaams — replace full setlist (MC only)
export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!can(session.user.role, Permission.MAJLIS_EDIT)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: majlisId } = await params;

  const majlis = await db.majlis.findUnique({ where: { id: majlisId } });
  if (!majlis) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = setMajlisSetlistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  // Verify all kalaams exist
  const found = await db.kalaam.findMany({
    where: { id: { in: parsed.data.kalaamIds } },
    select: { id: true },
  });
  if (found.length !== parsed.data.kalaamIds.length) {
    return NextResponse.json({ error: "One or more kalaams not found" }, { status: 422 });
  }

  // Transactional replace: add new, leave existing (skip duplicates)
  await db.$transaction(async (tx) => {
    // Remove kalaams no longer in the setlist
    await tx.majlisKalaam.deleteMany({
      where: { majlisId, kalaamId: { notIn: parsed.data.kalaamIds } },
    });
    // Add new kalaams (skip if already exists)
    for (const kalaamId of parsed.data.kalaamIds) {
      await tx.majlisKalaam.upsert({
        where: { majlisId_kalaamId: { majlisId, kalaamId } },
        create: { majlisId, kalaamId },
        update: {},
      });
    }
  });

  const updated = await db.majlis.findUnique({
    where: { id: majlisId },
    include: {
      kalaams: {
        include: {
          kalaam: { select: { id: true, title: true, category: true } },
          assignees: {
            include: {
              user: { select: { id: true, displayName: true, party: { select: { name: true } } } },
            },
          },
        },
      },
    },
  });

  return NextResponse.json(updated);
}
