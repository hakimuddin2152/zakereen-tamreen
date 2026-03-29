import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils-date";

const CATEGORY_LABELS: Record<string, string> = {
  MARASIYA: "Marasiya",
  SALAAM: "Salaam",
  MADEH: "Madeh",
  MISC: "Misc",
};

export default async function SessionsPage() {
  const session = await auth();
  const isPrivileged =
    session?.user?.role === "ADMIN" || session?.user?.role === "GOD";

  const sessions = await db.session.findMany({
    orderBy: { date: "desc" },
    include: {
      kalaams: { include: { kalaam: { select: { title: true, category: true } } } },
      _count: { select: { attendees: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Practice Sessions</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {sessions.length} session{sessions.length !== 1 ? "s" : ""}
          </p>
        </div>
        {isPrivileged && (
          <Link href="/sessions/new">
            <Button>+ New Session</Button>
          </Link>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg">No sessions recorded yet.</p>
          {isPrivileged && (
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
                    <span className="text-xs text-muted-foreground font-mono block mb-1">
                      {formatDate(s.date)}
                    </span>
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
