import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { can, Permission } from "@/lib/permissions";
import { formatDate } from "@/lib/utils-date";

export default async function MajlisListPage() {
  const session = await auth();
  const role = session?.user?.role ?? "";
  const canCreate = can(role, Permission.MAJLIS_CREATE);

  const allMajlis = await db.majlis.findMany({
    orderBy: { date: "desc" },
    include: {
      _count: { select: { kalaams: true } },
    },
  });

  const now = new Date();
  const upcoming = allMajlis.filter((m) => m.date >= now);
  const past = allMajlis.filter((m) => m.date < now);

  function MajlisCard({ m }: { m: (typeof allMajlis)[number] }) {
    return (
      <Link href={`/majlis/${m.id}`}>
        <div className="bg-card border border-border rounded-lg px-5 py-4 hover:bg-accent/40 transition-colors cursor-pointer">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-mono text-muted-foreground mb-1">
                {formatDate(m.date)}
              </p>
              <p className="font-semibold text-foreground truncate">
                {m.occasion ?? "Majlis"}
              </p>
              {m.notes && (
                <p className="text-muted-foreground text-sm line-clamp-1 mt-0.5">{m.notes}</p>
              )}
            </div>
            <Badge variant="secondary" className="shrink-0 text-xs">
              {m._count.kalaams} kalaam{m._count.kalaams !== 1 ? "s" : ""}
            </Badge>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Majlis</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {allMajlis.length} event{allMajlis.length !== 1 ? "s" : ""}
          </p>
        </div>
        {canCreate && (
          <Link href="/majlis/new">
            <Button>+ New Majlis</Button>
          </Link>
        )}
      </div>

      {allMajlis.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg">No Majlis events yet.</p>
          {canCreate && (
            <Link href="/majlis/new">
              <Button className="mt-4">Create First Majlis</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Upcoming ({upcoming.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {upcoming.map((m) => <MajlisCard key={m.id} m={m} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Past ({past.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {past.map((m) => <MajlisCard key={m.id} m={m} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
