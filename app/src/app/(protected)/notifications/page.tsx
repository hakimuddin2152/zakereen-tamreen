import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isCoordinator } from "@/lib/permissions";
import { formatDate } from "@/lib/utils-date";
import Link from "next/link";
import { NotificationsMarkRead } from "@/components/notifications/notifications-mark-read";

export default async function NotificationsPage() {
  const session = await auth();
  const userId = session!.user!.id;
  const role = session?.user?.role ?? "";

  if (!isCoordinator(role)) {
    return (
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold mb-4">Notifications</h1>
        <p className="text-muted-foreground text-sm">No notifications.</p>
      </div>
    );
  }

  const notifications = await db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { fromUser: { select: { id: true, displayName: true } } },
  });

  const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);

  // Mark as read server-side
  if (unreadIds.length > 0) {
    await db.notification.updateMany({
      where: { id: { in: unreadIds } },
      data: { read: true },
    });
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {notifications.some((n) => !n.read) && <NotificationsMarkRead />}
      </div>
      {notifications.length === 0 ? (
        <p className="text-muted-foreground text-sm">No notifications yet.</p>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-lg border px-4 py-3 flex items-start gap-3 ${
                !n.read ? "border-primary/40 bg-primary/5" : "border-border bg-card"
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm">{n.message}</p>
                {n.kalaamId && (
                  <Link
                    href={`/kalaams/${n.kalaamId}`}
                    className="text-xs text-primary hover:underline mt-0.5 block"
                  >
                    View kalaam →
                  </Link>
                )}
                <p className="text-xs text-muted-foreground mt-1">{formatDate(n.createdAt)}</p>
              </div>
              {!n.read && (
                <span className="mt-1 w-2 h-2 rounded-full bg-primary shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
