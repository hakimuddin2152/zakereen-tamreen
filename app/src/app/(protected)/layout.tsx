import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { db } from "@/lib/db";
import { isCoordinator } from "@/lib/permissions";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const unreadCount = isCoordinator(session.user.role)
    ? await db.notification.count({ where: { userId: session.user.id, read: false } })
    : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar user={session.user} unreadCount={unreadCount} />
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
