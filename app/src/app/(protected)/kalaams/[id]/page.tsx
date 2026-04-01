import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils-date";
import { Badge } from "@/components/ui/badge";
import { AudioPlayer } from "@/components/evaluations/audio-player";
import { PrerequisiteToggle } from "@/components/kalaams/prerequisite-toggle";
import { DeleteKalaamButton } from "@/components/admin/delete-kalaam-button";
import { EditKalaamDialog } from "@/components/admin/edit-kalaam-dialog";
import { AdminPrerequisiteTable } from "@/components/admin/admin-prerequisite-table";
import { KalaamRecordings } from "@/components/kalaams/kalaam-recordings";
import { PdfViewer } from "@/components/kalaams/pdf-viewer";
import { isCoordinator, can, Permission } from "@/lib/permissions";
import { EvalRequestButton } from "@/components/evaluations/eval-request-button";

interface Props {
  params: Promise<{ id: string }>;
}

const CATEGORY_LABELS: Record<string, string> = {
  MARASIYA: "Marasiya",
  SALAAM: "Salaam",
  MADEH: "Madeh",
  MISC: "Misc",
};

export default async function KalaamDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user!.id;
  const role = session?.user?.role ?? "";
  const isPrivileged = can(role, Permission.KALAAM_EDIT);

  const [kalaam, prereq, adminData, myRecordings, pendingEval] = await Promise.all([
    db.kalaam.findUnique({
      where: { id },
      include: {
        sessionKalaams: {
          include: {
            session: {
              include: {
                _count: { select: { attendees: true } },
                evaluations: { where: { userId }, select: { ranking: true, notes: true } },
              },
            },
          },
          orderBy: { session: { date: "desc" } },
        },
      },
    }),
    db.kalaamPrerequisite.findUnique({
      where: { userId_kalaamId: { userId, kalaamId: id } },
    }),
    isPrivileged
      ? Promise.all([
          // Exclude current user — they manage their own prereqs via "My Prerequisites"
          db.user.findMany({
            where: { isActive: true, role: { not: "GOD" }, id: { not: userId } },
            select: { id: true, displayName: true, party: { select: { name: true } } },
            orderBy: { displayName: "asc" },
          }),
          db.kalaamPrerequisite.findMany({ where: { kalaamId: id } }),
        ])
      : Promise.resolve(null),
    db.kalaamRecording.findMany({
      where: { userId, kalaamId: id },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    db.kalaamEvalRequest.findFirst({
      where: { userId, kalaamId: id, status: "PENDING" },
      select: { id: true },
    }),
  ]);

  if (!kalaam) notFound();

  const sessions = kalaam.sessionKalaams.map((sk) => sk.session);
  const allMembers = adminData?.[0] ?? [];
  const allPrereqs = adminData?.[1] ?? [];
  const userIsCoordinator = isCoordinator(role);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="secondary">{CATEGORY_LABELS[kalaam.category] ?? kalaam.category}</Badge>
            </div>
            <h1 className="text-2xl font-bold text-foreground">{kalaam.title}</h1>
            {kalaam.recitedBy && (
              <p className="text-muted-foreground text-sm mt-0.5">by {kalaam.recitedBy}</p>
            )}
          </div>
          {isPrivileged && (
            <div className="flex items-center gap-2">
              <EditKalaamDialog kalaam={kalaam} />
              <DeleteKalaamButton
                id={kalaam.id}
                title={kalaam.title}
                sessionCount={sessions.length}
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
          {(kalaam.highestNote || kalaam.lowestNote) && (
            <div className="text-sm text-muted-foreground">
              🎵 <span className="font-medium text-foreground">Vocal Range:</span>{" "}
              {kalaam.lowestNote ?? "?"} – {kalaam.highestNote ?? "?"}
            </div>
          )}
          {(kalaam.pdfFileKey || kalaam.pdfLink) && (
            <PdfViewer
              fileKey={kalaam.pdfFileKey}
              fileName={kalaam.pdfFileName}
              pdfLink={kalaam.pdfLink}
            />
          )}
        </div>

        {kalaam.audioFileKey && (
          <div className="mt-3 w-full">
            <p className="text-muted-foreground text-sm mb-1">Kalaam Audio</p>
            <AudioPlayer
              fileKey={kalaam.audioFileKey}
              fileName={kalaam.audioFileName ?? undefined}
            />
          </div>
        )}
      </div>

      {/* Prerequisite section */}
      <div className="bg-card border border-border rounded-lg overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-foreground font-semibold">My Prerequisites</h2>
          <p className="text-muted-foreground text-xs mt-0.5">
            Complete both to be eligible for sessions of this kalaam
          </p>
        </div>
        <div className="px-5 py-4 flex flex-col sm:flex-row gap-4">
          <PrerequisiteToggle
            kalaamId={id}
            field="lehenDone"
            label="Grasped Lehen"
            initialValue={prereq?.lehenDone ?? false}
          />
          <PrerequisiteToggle
            kalaamId={id}
            field="hifzDone"
            label="Read Twice"
            initialValue={prereq?.hifzDone ?? false}
          />
        </div>
        <div className="px-5 pb-4">
          <EvalRequestButton
            kalaamId={id}
            lehenDone={prereq?.lehenDone ?? false}
            hifzDone={prereq?.hifzDone ?? false}
            hasRecording={myRecordings.length > 0}
            isCoordinator={userIsCoordinator}
            isPending={pendingEval !== null}
          />
        </div>
      </div>

      {/* My practice recordings */}
      <div className="bg-card border border-border rounded-lg overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-foreground font-semibold">My Recordings</h2>
          <p className="text-muted-foreground text-xs mt-0.5">
            Upload your practice audio — last 3 are kept
          </p>
        </div>
        <KalaamRecordings kalaamId={id} initialRecordings={myRecordings} />
      </div>

      {/* Sessions */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-foreground font-semibold">
            Practice Sessions ({sessions.length})
          </h2>
        </div>

        {sessions.length === 0 ? (
          <div className="px-5 py-8 text-center text-muted-foreground">
            Not practiced in any session yet
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sessions.map((s) => {
              const myEval = s.evaluations[0] ?? null;
              return (
                <Link key={s.id} href={`/sessions/${s.id}`}>
                  <div className="px-5 py-3 hover:bg-accent/50 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-foreground text-sm font-mono">{formatDate(s.date)}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {myEval?.ranking != null && (
                          <span className="text-yellow-400 text-sm">
                            {"★".repeat(myEval.ranking)}
                            <span className="text-muted-foreground/30">{"★".repeat(5 - myEval.ranking)}</span>
                          </span>
                        )}
                        <span className="text-muted-foreground text-xs">
                          {s._count.attendees} attendee{s._count.attendees !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    {s.notes && (
                      <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{s.notes}</p>
                    )}
                    {myEval?.notes && (
                      <p className="text-muted-foreground text-xs mt-1 italic line-clamp-2">My notes: {myEval.notes}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Admin: manage prerequisites for all members */}
      {isPrivileged && (
        <div className="bg-card border border-border rounded-lg overflow-hidden mt-6">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-foreground font-semibold">Member Prerequisites</h2>
            <p className="text-muted-foreground text-xs mt-0.5">
              Manage Lehen &amp; Hifz completion for all members
            </p>
          </div>
          <AdminPrerequisiteTable
            kalaamId={id}
            members={allMembers}
            initialPrereqs={allPrereqs}
          />
        </div>
      )}
    </div>
  );
}
