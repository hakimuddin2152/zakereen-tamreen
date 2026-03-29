import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils-date";

export default async function DashboardPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const sessions = await db.session.findMany({
    orderBy: { date: "desc" },
    include: {
      kalaam: { select: { title: true } },
      attendees: { include: { user: { select: { id: true, displayName: true } } } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {sessions.length} session{sessions.length !== 1 ? "s" : ""} recorded
          </p>
        </div>
        {isAdmin && (
          <Link href="/sessions/new">
            <Button>+ New Session</Button>
          </Link>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg">No sessions yet.</p>
          {isAdmin && (
            <Link href="/sessions/new">
              <Button className="mt-4">Create First Session</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.map((dbSession) => (
            <Link key={dbSession.id} href={`/sessions/${dbSession.id}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="py-4 px-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground font-mono">
                          {formatDate(dbSession.date)}
                        </span>
                      </div>
                      <h2 className="text-foreground font-semibold mt-1 truncate">
                        {dbSession.kalaam.title}
                      </h2>
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {dbSession.attendees.slice(0, 6).map((att) => (
                          <span
                            key={att.user.id}
                            className="text-xs bg-secondary text-secondary-foreground rounded px-1.5 py-0.5"
                          >
                            {att.user.displayName}
                          </span>
                        ))}
                        {dbSession.attendees.length > 6 && (
                          <span className="text-xs text-muted-foreground">
                            +{dbSession.attendees.length - 6} more
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-muted-foreground text-sm">
                        {dbSession.attendees.length} attendee
                        {dbSession.attendees.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
