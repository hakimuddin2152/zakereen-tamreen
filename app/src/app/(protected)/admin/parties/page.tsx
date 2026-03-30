import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PartyCard } from "@/components/parties/party-card";
import { can, Permission } from "@/lib/permissions";

export default async function AdminPartiesPage() {
  const session = await auth();
  const role = session?.user?.role;
  if (!can(role ?? "", Permission.PARTY_CREATE)) redirect("/kalaams");

  const parties = await db.party.findMany({
    orderBy: { name: "asc" },
    include: {
      coordinator: { select: { id: true, displayName: true, username: true } },
      _count: { select: { members: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Parties</h1>
          <p className="text-muted-foreground text-sm mt-1">{parties.length} parties</p>
        </div>
        <Link href="/admin/parties/new">
          <Button>+ New Party</Button>
        </Link>
      </div>

      {parties.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No parties yet.</p>
          <Link href="/admin/parties/new">
            <Button className="mt-4">Create First Party</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {parties.map((p) => (
            <PartyCard
              key={p.id}
              party={{
                id: p.id,
                name: p.name,
                description: p.description,
                coordinator: p.coordinator,
                _count: p._count,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
