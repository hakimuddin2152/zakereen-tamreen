import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const CATEGORY_LABELS: Record<string, string> = {
  MARASIYA: "Marasiya",
  SALAAM: "Salaam",
  MADEH: "Madeh",
  MISC: "Misc",
};

const CATEGORY_ORDER = ["MARASIYA", "SALAAM", "MADEH", "MISC"] as const;

export default async function KalaamsPage() {
  const session = await auth();
  const isPrivileged =
    session?.user?.role === "ADMIN" || session?.user?.role === "GOD";

  const kalaams = await db.kalaam.findMany({
    orderBy: { title: "asc" },
    include: { _count: { select: { sessionKalaams: true } } },
  });

  const byCategory = Object.fromEntries(
    CATEGORY_ORDER.map((cat) => [cat, kalaams.filter((k) => k.category === cat)])
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kalaams</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {kalaams.length} kalaam{kalaams.length !== 1 ? "s" : ""}
          </p>
        </div>
        {isPrivileged && (
          <Link href="/admin/kalaams/new">
            <Button>+ Add Kalaam</Button>
          </Link>
        )}
      </div>

      <div className="space-y-8">
        {CATEGORY_ORDER.map((cat) => {
          const list = byCategory[cat];
          if (!list || list.length === 0) return null;
          return (
            <section key={cat}>
              <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                {CATEGORY_LABELS[cat]}
                <Badge variant="secondary" className="text-xs font-normal">
                  {list.length}
                </Badge>
              </h2>
              <div className="bg-card border border-border rounded-lg divide-y divide-border overflow-hidden">
                {list.map((k) => (
                  <Link key={k.id} href={`/kalaams/${k.id}`}>
                    <div className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-accent/50 transition-colors cursor-pointer">
                      <div>
                        <p className="text-foreground font-medium">{k.title}</p>
                        {k.recitedBy && (
                          <p className="text-muted-foreground text-xs">by {k.recitedBy}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {k._count.sessionKalaams > 0 && (
                          <span className="text-muted-foreground text-xs">
                            {k._count.sessionKalaams} session{k._count.sessionKalaams !== 1 ? "s" : ""}
                          </span>
                        )}
                        {k.audioFileKey && (
                          <Badge variant="outline" className="text-xs">Audio</Badge>
                        )}
                        {k.pdfLink && (
                          <Badge variant="outline" className="text-xs">PDF</Badge>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        {kalaams.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No kalaams yet.</p>
            {isPrivileged && (
              <Link href="/admin/kalaams/new">
                <Button className="mt-4">Add First Kalaam</Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
