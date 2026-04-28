import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export type KalaamStatus = "Ready" | "InProgress" | "AttendedPractice";

export interface MyKalaam {
  kalaamId: string;
  kalaamTitle: string;
  kalaamCategory: string;
  status: KalaamStatus;
  latestSessionDate: string | null;
  latestRanking: number | null;
  lehenDone: boolean;
  hifzDone: boolean;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // Get all sessions this user attended, with all kalaams in each session
  const attendances = await db.sessionAttendee.findMany({
    where: { userId },
    include: {
      session: {
        include: {
          kalaams: {
            include: {
              kalaam: { select: { id: true, title: true, category: true } },
            },
          },
        },
      },
    },
    orderBy: { session: { date: "desc" } },
  });

  // For each kalaam, keep only the latest session per kalaam
  type LatestEntry = {
    kalaamId: string;
    kalaamTitle: string;
    kalaamCategory: string;
    latestSessionId: string | null;
    latestSessionDate: Date | null;
  };

  const latestByKalaam = new Map<string, LatestEntry>();

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

  // Also include kalaams that have a standalone (non-session) eval — even if never attended
  const standaloneEvals = await db.reciterEvaluation.findMany({
    where: { userId, sessionId: { equals: null } },
    include: { kalaam: { select: { id: true, title: true, category: true } } },
    orderBy: { createdAt: "desc" },
  });

  const standaloneByKalaam = new Map<string, typeof standaloneEvals[number]>();
  for (const se of standaloneEvals) {
    if (!se.kalaamId || !se.kalaam) continue;
    if (!standaloneByKalaam.has(se.kalaamId)) standaloneByKalaam.set(se.kalaamId, se);
    // If no session attendance for this kalaam, add it to the list
    if (!latestByKalaam.has(se.kalaamId)) {
      latestByKalaam.set(se.kalaamId, {
        kalaamId: se.kalaamId,
        kalaamTitle: se.kalaam.title,
        kalaamCategory: se.kalaam.category,
        latestSessionId: null,
        latestSessionDate: null,
      });
    }
  }

  if (latestByKalaam.size === 0) {
    return NextResponse.json({ Ready: [], InProgress: [], AttendedPractice: [] });
  }

  const entries = Array.from(latestByKalaam.values());
  const kalaamIds = entries.map((e) => e.kalaamId);
  const sessionIds = entries.map((e) => e.latestSessionId).filter((id): id is string => id !== null);

  const [sessionEvaluations, prerequisites] = await Promise.all([
    sessionIds.length > 0
      ? db.reciterEvaluation.findMany({ where: { userId, sessionId: { in: sessionIds } } })
      : Promise.resolve([]),
    db.kalaamPrerequisite.findMany({ where: { userId, kalaamId: { in: kalaamIds } } }),
  ]);

  const evalBySession = new Map(sessionEvaluations.map((e) => [e.sessionId, e]));
  const prereqByKalaam = new Map(prerequisites.map((p) => [p.kalaamId, p]));

  const result: Record<KalaamStatus, MyKalaam[]> = {
    Ready: [],
    InProgress: [],
    AttendedPractice: [],
  };

  for (const entry of entries) {
    // Prefer session eval; fall back to standalone eval
    const sessionEv = entry.latestSessionId ? evalBySession.get(entry.latestSessionId) : undefined;
    const ev = sessionEv ?? standaloneByKalaam.get(entry.kalaamId);
    const prereq = prereqByKalaam.get(entry.kalaamId);
    const item: MyKalaam = {
      kalaamId: entry.kalaamId,
      kalaamTitle: entry.kalaamTitle,
      kalaamCategory: entry.kalaamCategory,
      status: "AttendedPractice",
      latestSessionDate: entry.latestSessionDate?.toISOString() ?? null,
      latestRanking: ev?.ranking ?? null,
      lehenDone: prereq?.lehenDone ?? false,
      hifzDone: prereq?.hifzDone ?? false,
    };

    if (!ev) {
      item.status = "AttendedPractice";
      result.AttendedPractice.push(item);
    } else if ((ev.ranking ?? 0) >= 4) {
      item.status = "Ready";
      result.Ready.push(item);
    } else {
      item.status = "InProgress";
      result.InProgress.push(item);
    }
  }

  return NextResponse.json(result);
}
