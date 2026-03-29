import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { formatDate } from "@/lib/utils-date";
import { Badge } from "@/components/ui/badge";
import { AudioPlayer } from "@/components/evaluations/audio-player";

interface Props {
  params: Promise<{ id: string }>;
}

function StarRating({ value }: { value: number | null }) {
  if (!value) return <span className="text-muted-foreground text-sm">Not rated</span>;
  return (
    <span className="text-yellow-400">
      {"★".repeat(value)}
      <span className="text-muted-foreground/30">{"★".repeat(5 - value)}</span>
    </span>
  );
}

export default async function ReciterProfilePage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  // Reciters can only view their own profile
  if (!isAdmin && session?.user?.id !== id) redirect("/dashboard");

  const reciter = await db.user.findUnique({
    where: { id },
    include: {
      evaluations: {
        orderBy: { session: { date: "desc" } },
        include: {
          session: {
            include: {
              kalaam: { select: { title: true } },
              lehenType: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!reciter) notFound();

  const totalRated = reciter.evaluations.filter((e: { ranking: number | null }) => e.ranking != null).length;
  const avgRanking = totalRated
    ? reciter.evaluations.reduce((s: number, e: { ranking: number | null }) => s + (e.ranking ?? 0), 0) / totalRated
    : null;

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-foreground">{reciter.displayName}</h1>
          <Badge
            variant="outline"
            className={reciter.isActive ? "border-green-600 text-green-600" : "border-destructive text-destructive"}
          >
            {reciter.isActive ? "Active" : "Inactive"}
          </Badge>
          {reciter.role === "ADMIN" && (
            <Badge variant="outline">Admin</Badge>
          )}
        </div>
        <p className="text-muted-foreground text-sm">@{reciter.username}</p>

        {avgRanking !== null && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Average ranking:</span>
            <span className="text-yellow-500 font-semibold">
              {avgRanking.toFixed(1)} / 5
            </span>
            <span className="text-muted-foreground text-sm">
              ({totalRated} session{totalRated !== 1 ? "s" : ""} rated)
            </span>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-foreground font-semibold">
            Session History ({reciter.evaluations.length})
          </h2>
        </div>

        {reciter.evaluations.length === 0 ? (
          <div className="px-5 py-8 text-center text-muted-foreground">
            No session evaluations yet
          </div>
        ) : (
          <div className="divide-y divide-border">
            {reciter.evaluations.map((ev: {
            id: string;
            ranking: number | null;
            voiceRange: string | null;
            audioFileKey: string | null;
            audioFileName: string | null;
            notes: string | null;
            session: { date: Date; kalaam: { title: string }; lehenType: { name: string } | null };
          }) => (
              <div key={ev.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-muted-foreground text-xs font-mono">
                        {formatDate(ev.session.date)}
                      </span>
                      {ev.session.lehenType && (
                        <Badge
                          variant="outline"
                          className="text-xs"
                        >
                          {ev.session.lehenType.name}
                        </Badge>
                      )}
                      {ev.voiceRange && (
                        <Badge
                          variant="outline"
                          className="border-primary/50 text-primary text-xs"
                        >
                          {ev.voiceRange}
                        </Badge>
                      )}
                    </div>
                    <p className="text-foreground font-medium">{ev.session.kalaam.title}</p>
                    <div className="mt-1 flex items-center gap-3">
                      <StarRating value={ev.ranking} />
                      {ev.notes && (
                        <span className="text-muted-foreground text-xs">"{ev.notes}"</span>
                      )}
                    </div>
                    {ev.audioFileKey && (
                      <div className="mt-2">
                        <AudioPlayer
                          fileKey={ev.audioFileKey}
                          fileName={ev.audioFileName ?? undefined}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
