import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils-date";
import { EvaluationTable } from "@/components/evaluations/evaluation-table";
import { SessionActions } from "@/components/sessions/session-actions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SessionDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const currentUserId = session?.user?.id;

  const dbSession = await db.session.findUnique({
    where: { id },
    include: {
      kalaam: true,
      attendees: {
        include: { user: { select: { id: true, displayName: true } } },
        orderBy: { user: { displayName: "asc" } },
      },
      evaluations: true,
    },
  });

  if (!dbSession) notFound();

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-muted-foreground text-sm font-mono">
              {formatDate(dbSession.date)}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{dbSession.kalaam.title}</h1>
          {dbSession.kalaam.poet && (
            <p className="text-muted-foreground text-sm mt-0.5">by {dbSession.kalaam.poet}</p>
          )}
          {dbSession.notes && (
            <p className="text-muted-foreground text-sm mt-2 max-w-prose">{dbSession.notes}</p>
          )}
        </div>
        {isAdmin && <SessionActions sessionId={id} />}
      </div>

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
        />
      </div>
    </div>
  );
}
