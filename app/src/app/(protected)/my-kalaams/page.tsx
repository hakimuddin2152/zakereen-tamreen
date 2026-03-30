import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils-date";
import { can, Permission } from "@/lib/permissions";
import { EvalRequestButton } from "@/components/evaluations/eval-request-button";

const CATEGORY_LABELS: Record<string, string> = {
  MARASIYA: "Marasiya",
  SALAAM: "Salaam",
  MADEH: "Madeh",
  MISC: "Misc",
};

type KalaamStatus = "Ready" | "InProgress" | "AttendedPractice";

interface SessionRef {
  id: string;
  date: Date;
}

interface KalaamEntry {
  kalaamId: string;
  kalaamTitle: string;
  kalaamCategory: string;
  status: KalaamStatus;
  sessions: SessionRef[];
  latestRanking: number | null;
  lehenDone: boolean;
  hifzDone: boolean;
  recordingCount: number;
  hasPendingEval: boolean;
}

async function getMyKalaams(userId: string): Promise<Record<KalaamStatus, KalaamEntry[]>> {
  // Step 1: all sessions the user attended
  const attended = await db.sessionAttendee.findMany({
    where: { userId },
    select: { sessionId: true, session: { select: { id: true, date: true } } },
  });

  const sessionIds = attended.map((a) => a.session.id);
  const sessionById = new Map(attended.map((a) => [a.session.id, a.session]));

  // Step 2: all kalaams in those sessions
  const sessionKalaams = sessionIds.length > 0
    ? await db.sessionKalaam.findMany({
        where: { sessionId: { in: sessionIds } },
        include: { kalaam: { select: { id: true, title: true, category: true } } },
      })
    : [];

  // Step 3: all evaluations for this user across those sessions
  const evaluations = sessionIds.length > 0
    ? await db.reciterEvaluation.findMany({
        where: { userId, sessionId: { in: sessionIds } },
      })
    : [];
  const evalByKey = new Map(evaluations.map((e) => [`${e.sessionId}_${e.kalaamId ?? ""}`, e]));

  // Step 4: build per-kalaam data from sessions
  const kalaamMap = new Map<
    string,
    {
      kalaamId: string;
      kalaamTitle: string;
      kalaamCategory: string;
      sessions: SessionRef[];
      latestEvalDate: Date | null;
      latestEvalRanking: number | null;
      hasEval: boolean;
    }
  >();

  for (const sk of sessionKalaams) {
    const sess = sessionById.get(sk.sessionId)!;
    const ev = evalByKey.get(`${sk.sessionId}_${sk.kalaam.id}`) ?? null;
    const kId = sk.kalaam.id;
    const existing = kalaamMap.get(kId);

    if (!existing) {
      kalaamMap.set(kId, {
        kalaamId: kId,
        kalaamTitle: sk.kalaam.title,
        kalaamCategory: sk.kalaam.category,
        sessions: [{ id: sess.id, date: sess.date }],
        latestEvalDate: ev ? sess.date : null,
        latestEvalRanking: ev?.ranking ?? null,
        hasEval: ev !== null,
      });
    } else {
      if (!existing.sessions.find((s) => s.id === sess.id)) {
        existing.sessions.push({ id: sess.id, date: sess.date });
      }
      if (
        ev !== null &&
        (existing.latestEvalDate === null || sess.date > existing.latestEvalDate)
      ) {
        existing.latestEvalDate = sess.date;
        existing.latestEvalRanking = ev.ranking ?? null;
        existing.hasEval = true;
      }
    }
  }

  // Sort sessions newest first
  for (const data of kalaamMap.values()) {
    data.sessions.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  // Step 5: eval requests — adds kalaams not in any session, and updates rankings for completed evals
  const evalRequests = await db.kalaamEvalRequest.findMany({
    where: { userId },
    include: { kalaam: { select: { id: true, title: true, category: true } } },
    orderBy: { requestedAt: "asc" },
  });

  for (const req of evalRequests) {
    const kId = req.kalaamId;
    const existing = kalaamMap.get(kId);

    if (!existing) {
      // Kalaam came through eval request only — add it to the map
      kalaamMap.set(kId, {
        kalaamId: kId,
        kalaamTitle: req.kalaam.title,
        kalaamCategory: req.kalaam.category,
        sessions: [],
        latestEvalDate: req.evaluatedAt ?? null,
        latestEvalRanking: req.ranking ?? null,
        hasEval: req.status === "EVALUATED",
      });
    } else if (req.status === "EVALUATED" && req.ranking !== null) {
      // Update existing entry if this eval request result is newer
      const reqDate = req.evaluatedAt ?? req.requestedAt;
      if (existing.latestEvalDate === null || reqDate > existing.latestEvalDate) {
        existing.latestEvalDate = reqDate;
        existing.latestEvalRanking = req.ranking;
        existing.hasEval = true;
      }
    }
  }

  const kalaamIds = Array.from(kalaamMap.keys());
  if (kalaamIds.length === 0) return { Ready: [], InProgress: [], AttendedPractice: [] };
  const prerequisites = await db.kalaamPrerequisite.findMany({
    where: { userId, kalaamId: { in: kalaamIds } },
  });
  const prereqByKalaam = new Map(prerequisites.map((p) => [p.kalaamId, p]));

  // Step 7: recording count per kalaam for this user
  const recordings = await db.kalaamRecording.findMany({
    where: { userId, kalaamId: { in: kalaamIds } },
    select: { kalaamId: true },
  });
  const recordingCountByKalaam = new Map<string, number>();
  for (const r of recordings) {
    recordingCountByKalaam.set(r.kalaamId, (recordingCountByKalaam.get(r.kalaamId) ?? 0) + 1);
  }

  // Step 8: pending eval requests for this user
  const pendingEvals = await db.kalaamEvalRequest.findMany({
    where: { userId, kalaamId: { in: kalaamIds }, status: "PENDING" },
    select: { kalaamId: true },
  });
  const pendingEvalKalaamIds = new Set(pendingEvals.map((e) => e.kalaamId));

  const result: Record<KalaamStatus, KalaamEntry[]> = { Ready: [], InProgress: [], AttendedPractice: [] };

  for (const data of kalaamMap.values()) {
    const prereq = prereqByKalaam.get(data.kalaamId);
    const item: KalaamEntry = {
      kalaamId: data.kalaamId,
      kalaamTitle: data.kalaamTitle,
      kalaamCategory: data.kalaamCategory,
      sessions: data.sessions,
      latestRanking: data.latestEvalRanking,
      lehenDone: prereq?.lehenDone ?? false,
      hifzDone: prereq?.hifzDone ?? false,
      recordingCount: recordingCountByKalaam.get(data.kalaamId) ?? 0,
      hasPendingEval: pendingEvalKalaamIds.has(data.kalaamId),
      status: "AttendedPractice",
    };

    if (!data.hasEval || !item.lehenDone || !item.hifzDone) {
      result.AttendedPractice.push(item);
    } else if ((data.latestEvalRanking ?? 0) >= 4) {
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

function SessionList({ sessions }: { sessions: SessionRef[] }) {
  return (
    <div className="mt-2 pl-1 flex flex-col gap-1">
      <p className="text-muted-foreground text-xs font-medium">
        Practiced in {sessions.length} session{sessions.length !== 1 ? "s" : ""}:
      </p>
      {sessions.map((s) => (
        <Link
          key={s.id}
          href={`/sessions/${s.id}`}
          className="text-xs text-primary hover:underline w-fit"
        >
          → {formatDate(s.date)}
        </Link>
      ))}
    </div>
  );
}

function KalaamCard({ entry, isCoordinator }: { entry: KalaamEntry; isCoordinator: boolean }) {
  if (entry.status === "AttendedPractice") {
    return (
      <div className="px-5 py-4">
        <Link href={`/kalaams/${entry.kalaamId}`} className="hover:underline">
          <p className="text-foreground font-medium">{entry.kalaamTitle}</p>
        </Link>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            {CATEGORY_LABELS[entry.kalaamCategory] ?? entry.kalaamCategory}
          </Badge>
          <PrereqBadge done={entry.lehenDone} label="Grasped Lehen" />
          <PrereqBadge done={entry.hifzDone} label="Go through" />
        </div>
        <SessionList sessions={entry.sessions} />
        <div className="mt-2">
          <EvalRequestButton
            kalaamId={entry.kalaamId}
            lehenDone={entry.lehenDone}
            hifzDone={entry.hifzDone}
            hasRecording={entry.recordingCount > 0}
            isCoordinator={isCoordinator}
            isPending={entry.hasPendingEval}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Link href={`/kalaams/${entry.kalaamId}`} className="hover:underline">
            <p className="text-foreground font-medium">{entry.kalaamTitle}</p>
          </Link>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              {CATEGORY_LABELS[entry.kalaamCategory] ?? entry.kalaamCategory}
            </Badge>
            <PrereqBadge done={entry.lehenDone} label="Grasped Lehen" />
            <PrereqBadge done={entry.hifzDone} label="Read Twice" />
          </div>
          <SessionList sessions={entry.sessions} />
          {entry.status !== "Ready" && (
            <div className="mt-2">
              <EvalRequestButton
                kalaamId={entry.kalaamId}
                lehenDone={entry.lehenDone}
                hifzDone={entry.hifzDone}
                hasRecording={entry.recordingCount > 0}
                isCoordinator={isCoordinator}
                isPending={entry.hasPendingEval}
              />
            </div>
          )}
        </div>
        <StarRating value={entry.latestRanking} />
      </div>
    </div>
  );
}

function Section({
  title,
  items,
  badgeClass,
  emptyText,
  isCoordinator,
}: {
  title: string;
  items: KalaamEntry[];
  badgeClass: string;
  emptyText: string;
  isCoordinator: boolean;
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
              <KalaamCard key={entry.kalaamId} entry={entry} isCoordinator={isCoordinator} />
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
  const role = session!.user!.role ?? "";
  const isCoordinator =
    can(role, Permission.MAJLIS_ASSIGN_ANY) || can(role, Permission.MAJLIS_ASSIGN_PARTY);

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
          isCoordinator={isCoordinator}
        />
        <Section
          title="In Progress"
          items={InProgress}
          badgeClass="bg-yellow-600/20 text-yellow-400 border-yellow-600/30"
          emptyText="No kalaams in progress."
          isCoordinator={isCoordinator}
        />
        <Section
          title="Need More Practice"
          items={AttendedPractice}
          badgeClass="bg-blue-600/20 text-blue-400 border-blue-600/30"
          emptyText="No Kalaams to show here. Kalaams will appear here after you attend a practice session but don't meet the requirements to recite that kalaam due to low ranking or pending prerequisites."
          isCoordinator={isCoordinator}
        />
      </div>
    </div>
  );
}
