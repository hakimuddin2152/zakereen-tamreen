import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AddKalaamDialog } from "@/components/admin/add-kalaam-dialog";
import { DeleteKalaamButton } from "@/components/admin/delete-kalaam-button";

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  const kalaams = await db.kalaam.findMany({
    orderBy: { title: "asc" },
    include: { _count: { select: { sessions: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kalaam Library</h1>
          <p className="text-muted-foreground text-sm mt-1">{kalaams.length} kalaams</p>
        </div>
        <AddKalaamDialog />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {kalaams.length === 0 ? (
          <p className="text-muted-foreground text-sm px-5 py-8 text-center">
            No kalaams yet. Add one to get started.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {kalaams.map((k) => (
              <div key={k.id} className="px-5 py-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-foreground font-medium">{k.title}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {k.poet ? `by ${k.poet}` : "Poet unknown"}
                    {k.language ? ` · ${k.language}` : ""}
                    {" · "}
                    {k._count.sessions} session{k._count.sessions !== 1 ? "s" : ""}
                  </p>
                </div>
                <DeleteKalaamButton id={k.id} title={k.title} sessionCount={k._count.sessions} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
