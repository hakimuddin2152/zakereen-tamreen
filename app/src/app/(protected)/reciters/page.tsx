import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils-date";
import { AddReciterDialog } from "@/components/reciters/add-reciter-dialog";
import { ReciterActions } from "@/components/reciters/reciter-actions";

export default async function RecitersPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  const reciters = await db.user.findMany({
    orderBy: { displayName: "asc" },
    select: {
      id: true, username: true, displayName: true, role: true, isActive: true, createdAt: true,
      _count: { select: { attendances: true, evaluations: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reciters</h1>
          <p className="text-muted-foreground text-sm mt-1">{reciters.length} accounts</p>
        </div>
        <AddReciterDialog />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="divide-y divide-border">
          {reciters.map((reciter) => (
            <div key={reciter.id} className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap">              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/reciters/${reciter.id}`}
                    className="font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {reciter.displayName}
                  </Link>
                  <Badge
                    variant="outline"
                    className={reciter.isActive ? "border-green-600 text-green-600 text-xs" : "border-destructive text-destructive text-xs"}
                  >
                    {reciter.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {reciter.role === "ADMIN" && (
                    <Badge variant="outline" className="text-xs">Admin</Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-sm">@{reciter.username}</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {reciter._count.attendances} sessions · {reciter._count.evaluations} evaluations ·
                  Joined {formatDate(reciter.createdAt)}
                </p>
              </div>
              <ReciterActions
                reciterId={reciter.id}
                isActive={reciter.isActive}
                displayName={reciter.displayName}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
