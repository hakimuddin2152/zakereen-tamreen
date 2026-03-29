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

  // For each (kalaam, session) pair, keep only the latest session per kalaam
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

  if (latestByKalaam.size === 0) {
    return NextResponse.json({ Ready: [], InProgress: [], AttendedPractice: [] });
  }

  const entries = Array.from(latestByKalaam.values());
  const kalaamIds = entries.map((e) => e.kalaamId);
  const sessionIds = entries.map((e) => e.latestSessionId);

  const [evaluations, prerequisites] = await Promise.all([
    db.reciterEvaluation.findMany({ where: { userId, sessionId: { in: sessionIds } } }),
    db.kalaamPrerequisite.findMany({ where: { userId, kalaamId: { in: kalaamIds } } }),
  ]);

  const evalBySession = new Map(evaluations.map((e) => [e.sessionId, e]));
  const prereqByKalaam = new Map(prerequisites.map((p) => [p.kalaamId, p]));

  const result: Record<KalaamStatus, MyKalaam[]> = {
    Ready: [],
    InProgress: [],
    AttendedPractice: [],
  };

  for (const entry of entries) {
    const ev = evalBySession.get(entry.latestSessionId);
    const prereq = prereqByKalaam.get(entry.kalaamId);
    const item: MyKalaam = {
      kalaamId: entry.kalaamId,
      kalaamTitle: entry.kalaamTitle,
      kalaamCategory: entry.kalaamCategory,
      status: "AttendedPractice",
      latestSessionDate: entry.latestSessionDate.toISOString(),
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
