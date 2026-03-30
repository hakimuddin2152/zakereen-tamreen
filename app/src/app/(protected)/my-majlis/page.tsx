import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils-date";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function MyMajlisPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const assignments = await db.majlisKalaamMember.findMany({
    where: { userId },
    include: {
      majlisKalaam: {
        include: {
          majlis: { select: { id: true, date: true, occasion: true } },
          kalaam: { select: { id: true, title: true } },
        },
      },
    },
  });

  // Group by majlis
  const majlisMap = new Map<
    string,
    {
      id: string;
      date: Date;
      occasion: string | null;
      kalaams: { id: string; title: string }[];
    }
  >();

  for (const a of assignments) {
    const m = a.majlisKalaam.majlis;
    const k = a.majlisKalaam.kalaam;
    if (!majlisMap.has(m.id)) {
      majlisMap.set(m.id, { id: m.id, date: m.date, occasion: m.occasion, kalaams: [] });
    }
    majlisMap.get(m.id)!.kalaams.push(k);
  }

  const now = new Date();
  const all = Array.from(majlisMap.values());
  const upcoming = all
    .filter((m) => m.date >= now)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const past = all
    .filter((m) => m.date < now)
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  function MajlisEntry({ m }: { m: (typeof all)[number] }) {
    return (
      <Link href={`/majlis/${m.id}`}>
        <div className="px-5 py-4 hover:bg-accent/50 transition-colors cursor-pointer">
          <p className="text-xs font-mono text-muted-foreground mb-1">{formatDate(m.date)}</p>
          <p className="font-semibold text-foreground">{m.occasion ?? "Majlis"}</p>
          <div className="flex gap-1.5 flex-wrap mt-1.5">
            {m.kalaams.map((k) => (
              <Badge key={k.id} variant="secondary" className="text-xs">{k.title}</Badge>
            ))}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">My Majlis</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Majlis events you are assigned to recite
        </p>
      </div>

      {all.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground">You have not been assigned to any Majlis yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Upcoming ({upcoming.length})
              </h2>
              <div className="bg-card border border-border rounded-lg divide-y divide-border overflow-hidden">
                {upcoming.map((m) => <MajlisEntry key={m.id} m={m} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Past ({past.length})
              </h2>
              <div className="bg-card border border-border rounded-lg divide-y divide-border overflow-hidden">
                {past.map((m) => <MajlisEntry key={m.id} m={m} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
