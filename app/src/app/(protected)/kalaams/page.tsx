import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { KalaamBrowser } from "@/components/kalaams/kalaam-browser";

export default async function KalaamsPage() {
  const session = await auth();
  const isPrivileged =
    session?.user?.role === "ADMIN" || session?.user?.role === "GOD";

  const kalaams = await db.kalaam.findMany({
    orderBy: { title: "asc" },
    include: { _count: { select: { sessionKalaams: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kalaams</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {kalaams.length} kalaam{kalaams.length !== 1 ? "s" : ""}
          </p>
        </div>
        {isPrivileged && (
          <Link href="/admin/kalaams/new">
            <Button>+ Add Kalaam</Button>
          </Link>
        )}
      </div>

      {kalaams.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg">No kalaams yet.</p>
          {isPrivileged && (
            <Link href="/admin/kalaams/new">
              <Button className="mt-4">Add First Kalaam</Button>
            </Link>
          )}
        </div>
      ) : (
        <KalaamBrowser kalaams={kalaams} isPrivileged={isPrivileged} />
      )}
    </div>
  );
}
