import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils-date";
import { Badge } from "@/components/ui/badge";
import { AudioPlayer } from "@/components/evaluations/audio-player";
import { PrerequisiteToggle } from "@/components/kalaams/prerequisite-toggle";

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

  const [kalaam, prereq] = await Promise.all([
    db.kalaam.findUnique({
      where: { id },
      include: {
        sessionKalaams: {
          include: {
            session: {
              include: { _count: { select: { attendees: true } } },
            },
          },
          orderBy: { session: { date: "desc" } },
        },
      },
    }),
    db.kalaamPrerequisite.findUnique({
      where: { userId_kalaamId: { userId, kalaamId: id } },
    }),
  ]);

  if (!kalaam) notFound();

  const sessions = kalaam.sessionKalaams.map((sk) => sk.session);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <Badge variant="secondary">{CATEGORY_LABELS[kalaam.category] ?? kalaam.category}</Badge>
        </div>
        <h1 className="text-2xl font-bold text-foreground">{kalaam.title}</h1>
        {kalaam.recitedBy && (
          <p className="text-muted-foreground text-sm mt-0.5">by {kalaam.recitedBy}</p>
        )}

        <div className="flex items-center gap-4 mt-3 flex-wrap">
          {(kalaam.highestNote || kalaam.lowestNote) && (
            <div className="text-sm text-muted-foreground">
              🎵 <span className="font-medium text-foreground">Vocal Range:</span>{" "}
              {kalaam.lowestNote ?? "?"} – {kalaam.highestNote ?? "?"}
            </div>
          )}
          {kalaam.pdfLink && (
            <a
              href={kalaam.pdfLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              📄 PDF
            </a>
          )}
        </div>

        {kalaam.audioFileKey && (
          <div className="mt-4">
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
            label="Lehen"
            initialValue={prereq?.lehenDone ?? false}
          />
          <PrerequisiteToggle
            kalaamId={id}
            field="hifzDone"
            label="Hifz"
            initialValue={prereq?.hifzDone ?? false}
          />
        </div>
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
            {sessions.map((s) => (
              <Link key={s.id} href={`/sessions/${s.id}`}>
                <div className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-accent/50 transition-colors cursor-pointer">
                  <span className="text-foreground text-sm font-mono">{formatDate(s.date)}</span>
                  <span className="text-muted-foreground text-xs">
                    {s._count.attendees} attendee{s._count.attendees !== 1 ? "s" : ""}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
