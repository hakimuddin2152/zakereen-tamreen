import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

const GRADE_COLORS: Record<string, string> = {
  A: "border-green-600 text-green-600",
  B: "border-blue-500 text-blue-500",
  C: "border-yellow-500 text-yellow-500",
  D: "border-destructive text-destructive",
};

const ROLE_LABELS: Record<string, string> = {
  MC: "Mauze Coordinator",
  PC: "Party Coordinator",
  PM: "Member",
  IM: "Individual",
};

export default async function MembersPage() {
  await auth(); // Must be authenticated (middleware handles redirect)

  const members = await db.user.findMany({
    where: { isActive: true, role: { not: "GOD" } },
    orderBy: { displayName: "asc" },
    select: {
      id: true,
      displayName: true,
      username: true,
      role: true,
      grade: true,
      partyId: true,
      party: { select: { id: true, name: true } },
    },
  });

  // Group by party
  const partyMap = new Map<string, { name: string; members: typeof members }>();
  const individuals: typeof members = [];

  for (const m of members) {
    if (m.party) {
      if (!partyMap.has(m.party.id)) {
        partyMap.set(m.party.id, { name: m.party.name, members: [] });
      }
      partyMap.get(m.party.id)!.members.push(m);
    } else {
      individuals.push(m);
    }
  }

  const partyGroups = Array.from(partyMap.entries()).sort((a, b) =>
    a[1].name.localeCompare(b[1].name)
  );

  function MemberRow({ m }: { m: (typeof members)[number] }) {
    return (
      <Link
        href={`/members/${m.id}`}
        className="flex items-center gap-3 px-5 py-3 hover:bg-accent/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <span className="font-medium text-foreground">{m.displayName}</span>
          <span className="text-muted-foreground text-sm ml-1.5">@{m.username}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {m.grade && (
            <Badge variant="outline" className={`text-xs font-bold ${GRADE_COLORS[m.grade] ?? ""}`}>
              {m.grade}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {ROLE_LABELS[m.role] ?? m.role}
          </Badge>
        </div>
      </Link>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Members</h1>
        <p className="text-muted-foreground text-sm mt-1">{members.length} active members</p>
      </div>

      <div className="space-y-6">
        {partyGroups.map(([, group]) => (
          <div key={group.name}>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {group.name}
            </h2>
            <div className="bg-card border border-border rounded-lg divide-y divide-border overflow-hidden">
              {group.members.map((m) => (
                <MemberRow key={m.id} m={m} />
              ))}
            </div>
          </div>
        ))}

        {individuals.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Individuals
            </h2>
            <div className="bg-card border border-border rounded-lg divide-y divide-border overflow-hidden">
              {individuals.map((m) => (
                <MemberRow key={m.id} m={m} />
              ))}
            </div>
          </div>
        )}

        {members.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No members found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
