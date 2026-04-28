import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isCoordinator } from "@/lib/permissions";

// GET /api/notifications — unread count + latest 20 for coordinators
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isCoordinator(session.user.role)) {
    return NextResponse.json({ count: 0, items: [] });
  }

  const [count, items] = await Promise.all([
    db.notification.count({ where: { userId: session.user.id, read: false } }),
    db.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        fromUser: { select: { id: true, displayName: true } },
      },
    }),
  ]);

  return NextResponse.json({ count, items });
}

// PATCH /api/notifications — mark all as read
export async function PATCH() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  });

  return NextResponse.json({ success: true });
}
