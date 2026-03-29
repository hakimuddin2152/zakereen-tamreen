import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils-date";

const CATEGORY_LABELS: Record<string, string> = {
  MARASIYA: "Marasiya",
  SALAAM: "Salaam",
  MADEH: "Madeh",
  MISC: "Misc",
};

type KalaamStatus = "Ready" | "InProgress" | "AttendedPractice";

interface KalaamEntry {
  kalaamId: string;
  kalaamTitle: string;
  kalaamCategory: string;
  status: KalaamStatus;
  latestSessionDate: Date;
  latestRanking: number | null;
  lehenDone: boolean;
  hifzDone: boolean;
}

async function getMyKalaams(userId: string): Promise<Record<KalaamStatus, KalaamEntry[]>> {
  const attendances = await db.sessionAttendee.findMany({
    where: { userId },
    include: {
      session: {
        include: {
          kalaams: {
            include: { kalaam: { select: { id: true, title: true, category: true } } },
          },
        },
      },
    },
    orderBy: { session: { date: "desc" } },
  });

  // Flatten multi-kalaam sessions — track latest session per kalaamId
  const latestByKalaam = new Map<
    string,
    { kalaamId: string; kalaamTitle: string; kalaamCategory: string; latestSessionId: string; latestSessionDate: Date }
  >();

  for (const att of attendances) {
    for (const sk of att.session.kalaams) {
      const kId = sk.kalaam.id;
      if (!latestByKalaam.has(kId)) {
        latestByKalaam.set(kId, {
          kalaamId: kId,
          kalaamTitle: sk.kalaam.title,
          kalaamCategory: sk.kalaam.category,
          latestSessionId: att.session.id,
          latestSessionDate: att.session.date,
        });
      }
    }
  }

  if (latestByKalaam.size === 0) return { Ready: [], InProgress: [], AttendedPractice: [] };

  const entries = Array.from(latestByKalaam.values());
  const sessionIds = [...new Set(entries.map((e) => e.latestSessionId))];
  const kalaamIds = entries.map((e) => e.kalaamId);

  const [evaluations, prerequisites] = await Promise.all([
    db.reciterEvaluation.findMany({ where: { userId, sessionId: { in: sessionIds } } }),
    db.kalaamPrerequisite.findMany({ where: { userId, kalaamId: { in: kalaamIds } } }),
  ]);

  const evalBySession = new Map(evaluations.map((e) => [e.sessionId, e]));
  const prereqByKalaam = new Map(prerequisites.map((p) => [p.kalaamId, p]));

  const result: Record<KalaamStatus, KalaamEntry[]> = { Ready: [], InProgress: [], AttendedPractice: [] };

  for (const entry of entries) {
    const ev = evalBySession.get(entry.latestSessionId);
    const prereq = prereqByKalaam.get(entry.kalaamId);
    const item: KalaamEntry = {
      kalaamId: entry.kalaamId,
      kalaamTitle: entry.kalaamTitle,
      kalaamCategory: entry.kalaamCategory,
      latestSessionDate: entry.latestSessionDate,
      latestRanking: ev?.ranking ?? null,
      lehenDone: prereq?.lehenDone ?? false,
      hifzDone: prereq?.hifzDone ?? false,
      status: "AttendedPractice",
    };
    if (!ev) {
      result.AttendedPractice.push(item);
    } else if ((ev.ranking ?? 0) >= 4) {
      item.status = "Ready";
      result.Ready.push(item);
    } else {
      item.status = "InProgress";
      result.InProgress.push(item);
    }
  }

  return result;
}

function StarRating({ value }: { value: number | null }) {
  if (!value) return null;
  return (
    <span className="text-yellow-400 text-sm">
      {"★".repeat(value)}
      <span className="text-muted-foreground/30">{"★".repeat(5 - value)}</span>
    </span>
  );
}

function PrereqBadge({ done, label }: { done: boolean; label: string }) {
  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded font-medium ${
        done
          ? "bg-green-600/20 text-green-400 border border-green-600/30"
          : "bg-red-600/20 text-red-400 border border-red-600/30"
      }`}
    >
      {done ? "✓" : "✗"} {label}
    </span>
  );
}

function KalaamCard({ entry }: { entry: KalaamEntry }) {
  return (
    <Link href={`/kalaams/${entry.kalaamId}`}>
      <div className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-accent/50 transition-colors cursor-pointer">
        <div>
          <p className="text-foreground font-medium">{entry.kalaamTitle}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              {CATEGORY_LABELS[entry.kalaamCategory] ?? entry.kalaamCategory}
            </Badge>
            <span className="text-muted-foreground text-xs">
              {formatDate(entry.latestSessionDate)}
            </span>
            <PrereqBadge done={entry.lehenDone} label="Lehen" />
            <PrereqBadge done={entry.hifzDone} label="Hifz" />
          </div>
        </div>
        <StarRating value={entry.latestRanking} />
      </div>
    </Link>
  );
}

function Section({
  title,
  items,
  badgeClass,
  emptyText,
}: {
  title: string;
  items: KalaamEntry[];
  badgeClass: string;
  emptyText: string;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
        {title}
        <Badge className={`text-xs font-normal ${badgeClass}`}>{items.length}</Badge>
      </h2>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm px-5 py-6 text-center">{emptyText}</p>
        ) : (
          <div className="divide-y divide-border">
            {items.map((entry) => (
              <KalaamCard key={entry.kalaamId} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default async function MyKalaamsPage() {
  const session = await auth();
  const userId = session!.user!.id;

  const { Ready, InProgress, AttendedPractice } = await getMyKalaams(userId);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">My Kalaams</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {Ready.length + InProgress.length + AttendedPractice.length} kalaams total
        </p>
      </div>

      <div className="space-y-8">
        <Section
          title="Ready"
          items={Ready}
          badgeClass="bg-green-600/20 text-green-400 border-green-600/30"
          emptyText="No kalaams rated 4+ yet. Keep practicing!"
        />
        <Section
          title="In Progress"
          items={InProgress}
          badgeClass="bg-yellow-600/20 text-yellow-400 border-yellow-600/30"
          emptyText="No kalaams in progress."
        />
        <Section
          title="Attended Practice"
          items={AttendedPractice}
          badgeClass="bg-blue-600/20 text-blue-400 border-blue-600/30"
          emptyText="You haven't attended any sessions yet."
        />
      </div>
    </div>
  );
}
