import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils-date";
import { Badge } from "@/components/ui/badge";
import { EvaluationTable } from "@/components/evaluations/evaluation-table";
import { SessionActions } from "@/components/sessions/session-actions";

interface Props {
  params: Promise<{ id: string }>;
}

const CATEGORY_LABELS: Record<string, string> = {
  MARASIYA: "Marasiya",
  SALAAM: "Salaam",
  MADEH: "Madeh",
  MISC: "Misc",
};

export default async function SessionDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "GOD";
  const currentUserId = session?.user?.id;

  const dbSession = await db.session.findUnique({
    where: { id },
    include: {
      kalaams: {
        include: { kalaam: true },
        orderBy: { kalaam: { title: "asc" } },
      },
      attendees: {
        include: { user: { select: { id: true, displayName: true } } },
        orderBy: { user: { displayName: "asc" } },
      },
      evaluations: true,
    },
  });

  if (!dbSession) notFound();

  const kalaamList = dbSession.kalaams.map((sk) => sk.kalaam);

  let allKalaams: { id: string; title: string; category: string; recitedBy: string | null }[] = [];
  let allReciters: { id: string; displayName: string }[] = [];
  if (isAdmin) {
    [allKalaams, allReciters] = await Promise.all([
      db.kalaam.findMany({ orderBy: { title: "asc" } }),
      db.user.findMany({
        where: { isActive: true, role: { not: "GOD" } },
        select: { id: true, displayName: true },
        orderBy: { displayName: "asc" },
      }),
    ]);
  }

  // Fetch practice recordings for all attendees × kalaams in this session (for admin eval dialog)
  const attendeeIds = dbSession.attendees.map((a) => a.userId);
  const kalaamIds = dbSession.kalaams.map((sk) => sk.kalaamId);
  const recordings = isAdmin
    ? await db.kalaamRecording.findMany({
        where: { userId: { in: attendeeIds }, kalaamId: { in: kalaamIds } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <span className="text-muted-foreground text-sm font-mono">
            {formatDate(dbSession.date)}
          </span>
          <h1 className="text-2xl font-bold text-foreground mt-1">
            {kalaamList.length === 1
              ? kalaamList[0].title
              : `${kalaamList.length} Kalaams`}
          </h1>
          {dbSession.notes && (
            <p className="text-muted-foreground text-sm mt-2 max-w-prose">{dbSession.notes}</p>
          )}
        </div>
        {isAdmin && (
          <SessionActions
            sessionId={id}
            currentDate={dbSession.date.toISOString().split("T")[0]}
            currentNotes={dbSession.notes}
            currentKalaamIds={dbSession.kalaams.map((sk) => sk.kalaamId)}
            currentAttendeeIds={dbSession.attendees.map((a) => a.userId)}
            allKalaams={allKalaams}
            allReciters={allReciters}
          />
        )}
      </div>

      {/* Kalaams practiced */}
      <div className="bg-card border border-border rounded-lg overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-foreground font-semibold">
            Kalaams ({kalaamList.length})
          </h2>
        </div>
        <div className="divide-y divide-border">
          {kalaamList.map((k) => (
            <Link key={k.id} href={`/kalaams/${k.id}`}>
              <div className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-accent/50 transition-colors cursor-pointer">
                <div>
                  <p className="text-foreground font-medium">{k.title}</p>
                  {k.recitedBy && (
                    <p className="text-muted-foreground text-xs">by {k.recitedBy}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    {CATEGORY_LABELS[k.category] ?? k.category}
                  </Badge>
                  {(k.highestNote || k.lowestNote) && (
                    <span className="text-muted-foreground text-xs">
                      {k.lowestNote ?? "?"}–{k.highestNote ?? "?"}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Attendees + evaluations */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-foreground font-semibold">
            Attendees ({dbSession.attendees.length})
          </h2>
        </div>
        <EvaluationTable
          attendees={dbSession.attendees.map((att) => att.user)}
          evaluations={dbSession.evaluations}
          isAdmin={isAdmin}
          currentUserId={currentUserId!}
          sessionId={id}
          kalaams={kalaamList.map((k) => ({ id: k.id, title: k.title }))}
          recordings={recordings}
        />
      </div>
    </div>
  );
}
