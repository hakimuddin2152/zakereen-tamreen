import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils-date";
import { can, Permission } from "@/lib/permissions";

const CATEGORY_LABELS: Record<string, string> = {
  MARASIYA: "Marasiya",
  SALAAM: "Salaam",
  MADEH: "Madeh",
  MISC: "Misc",
};

export default async function SessionsPage() {
  const session = await auth();
  const role = session?.user?.role ?? "";
  const userId = session?.user?.id ?? "";
  const partyId = session?.user?.partyId ?? null;

  const canCreateAny = can(role, Permission.SESSION_CREATE_ANY);
  const canCreateParty = can(role, Permission.SESSION_CREATE_PARTY);
  const canViewAll = can(role, Permission.SESSION_VIEW_ALL);
  const canViewParty = can(role, Permission.SESSION_VIEW_PARTY);

  // Build scoped where clause
  type WhereClause = {
    OR?: Array<Record<string, unknown>>;
    attendees?: { some: { userId: string } };
  };

  let where: WhereClause = {};
  if (!canViewAll) {
    if (canViewParty && partyId) {
      where = {
        OR: [
          { partyId },
          { attendees: { some: { userId } } },
        ],
      };
    } else {
      // PM / IM: only sessions they attended
      where = { attendees: { some: { userId } } };
    }
  }

  const sessions = await db.session.findMany({
    where,
    orderBy: { date: "desc" },
    include: {
      kalaams: { include: { kalaam: { select: { title: true, category: true } } } },
      party: { select: { name: true } },
      _count: { select: { attendees: true } },
    },
  });

  const canCreate = canCreateAny || canCreateParty;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Practice Sessions</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {sessions.length} session{sessions.length !== 1 ? "s" : ""}
          </p>
        </div>
        {canCreate && (
          <Link href="/sessions/new">
            <Button>+ New Session</Button>
          </Link>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg">No sessions recorded yet.</p>
          {canCreate && (
            <Link href="/sessions/new">
              <Button className="mt-4">Create First Session</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg divide-y divide-border overflow-hidden">
          {sessions.map((s) => {
            const kalaamList = s.kalaams.map((sk) => sk.kalaam);
            return (
              <Link key={s.id} href={`/sessions/${s.id}`}>
                <div className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground font-mono">
                        {formatDate(s.date)}
                      </span>
                      {s.party && (
                        <Badge variant="outline" className="text-xs">{s.party.name}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {kalaamList.slice(0, 3).map((k, i) => (
                        <span key={i} className="text-foreground text-sm font-medium">
                          {k.title}
                          {i < Math.min(kalaamList.length, 3) - 1 && (
                            <span className="text-muted-foreground"> · </span>
                          )}
                        </span>
                      ))}
                      {kalaamList.length > 3 && (
                        <span className="text-muted-foreground text-xs">
                          +{kalaamList.length - 3} more
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {[...new Set(kalaamList.map((k) => k.category))].map((cat) => (
                        <Badge key={cat} variant="secondary" className="text-xs">
                          {CATEGORY_LABELS[cat] ?? cat}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <span className="text-muted-foreground text-sm shrink-0">
                    {s._count.attendees} attendee{s._count.attendees !== 1 ? "s" : ""}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

