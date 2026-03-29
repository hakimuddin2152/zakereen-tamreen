import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils-date";
import { AddReciterDialog } from "@/components/reciters/add-reciter-dialog";
import { ReciterActions } from "@/components/reciters/reciter-actions";

const GRADE_COLORS: Record<string, string> = {
  A: "border-green-600 text-green-600",
  B: "border-blue-500 text-blue-500",
  C: "border-yellow-500 text-yellow-500",
  D: "border-destructive text-destructive",
};

export default async function MembersPage() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "GOD") redirect("/kalaams");

  const members = await db.user.findMany({
    where: { role: { not: "GOD" } },
    orderBy: { displayName: "asc" },
    select: {
      id: true, username: true, displayName: true, partyName: true,
      role: true, grade: true, isActive: true, createdAt: true,
      _count: { select: { attendances: true, evaluations: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Party Members</h1>
          <p className="text-muted-foreground text-sm mt-1">{members.length} members</p>
        </div>
        <AddReciterDialog />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {members.length === 0 ? (
          <p className="text-muted-foreground text-sm px-5 py-8 text-center">
            No party members yet.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {members.map((m) => (
              <div key={m.id} className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/reciters/${m.id}`}
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {m.displayName}
                    </Link>
                    <Badge
                      variant="outline"
                      className={
                        m.isActive
                          ? "border-green-600 text-green-600 text-xs"
                          : "border-destructive text-destructive text-xs"
                      }
                    >
                      {m.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {m.grade && (
                      <Badge
                        variant="outline"
                        className={`text-xs font-bold ${GRADE_COLORS[m.grade] ?? ""}`}
                      >
                        Grade {m.grade}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm">@{m.username}</p>
                  {m.partyName && (
                    <p className="text-muted-foreground text-xs">{m.partyName}</p>
                  )}
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {m._count.attendances} sessions · {m._count.evaluations} evaluations ·
                    Joined {formatDate(m.createdAt)}
                  </p>
                </div>
                <ReciterActions
                  reciterId={m.id}
                  isActive={m.isActive}
                  displayName={m.displayName}
                  currentGrade={m.grade ?? undefined}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
