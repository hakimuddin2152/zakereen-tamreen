import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { can, Permission } from "@/lib/permissions";
import { AssignCoordinatorDialog } from "@/components/parties/assign-coordinator-dialog";
import { AssignMemberDialog } from "@/components/parties/assign-member-dialog";
import { RemoveMemberClientButton } from "@/components/parties/remove-member-button";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PartyDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const role = session?.user?.role ?? "";

  if (!can(role, Permission.PARTY_VIEW)) redirect("/kalaams");

  const party = await db.party.findUnique({
    where: { id },
    include: {
      coordinator: { select: { id: true, displayName: true, username: true } },
      members: {
        orderBy: { displayName: "asc" },
        select: { id: true, displayName: true, username: true, role: true, grade: true, isActive: true },
      },
    },
  });

  if (!party) notFound();

  const isMC = can(role, Permission.PARTY_CREATE);

  // For MC: get list of PCs/MCs to assign as coordinators
  const availablePCs = isMC
    ? await db.user.findMany({
        where: { role: { in: ["PC", "MC"] }, isActive: true },
        select: { id: true, displayName: true, username: true },
        orderBy: { displayName: "asc" },
      })
    : [];

  // For MC add-member: get unaffiliated users (partyId null, not GOD)
  const availableToAdd = isMC
    ? await db.user.findMany({
        where: { isActive: true, partyId: null, role: { not: "GOD" } },
        select: { id: true, displayName: true, username: true, role: true },
        orderBy: { displayName: "asc" },
      })
    : [];

  const ROLE_LABELS: Record<string, string> = { MC: "MC", PC: "PC", PM: "Member", IM: "Individual" };
  const GRADE_COLORS: Record<string, string> = {
    A: "border-green-600 text-green-600",
    B: "border-blue-500 text-blue-500",
    C: "border-yellow-500 text-yellow-500",
    D: "border-destructive text-destructive",
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/admin/parties" className="text-muted-foreground text-sm hover:text-foreground">
                Parties
              </Link>
              <span className="text-muted-foreground text-sm">/</span>
              <h1 className="text-2xl font-bold text-foreground">{party.name}</h1>
            </div>
            {party.description && (
              <p className="text-muted-foreground text-sm">{party.description}</p>
            )}
            {party.coordinator ? (
              <p className="text-sm text-muted-foreground mt-1">
                Coordinator:{" "}
                <Link href={`/members/${party.coordinator.id}`} className="text-primary hover:underline">
                  {party.coordinator.displayName}
                </Link>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">No coordinator assigned</p>
            )}
          </div>
          {isMC && (
            <div className="flex gap-2 flex-wrap">
              <AssignCoordinatorDialog
                partyId={id}
                currentCoordinatorId={party.coordinatorId}
                coordinators={availablePCs}
              />
              <AssignMemberDialog
                partyId={id}
                availableMembers={availableToAdd}
              />
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="font-semibold text-foreground">Members ({party.members.length})</h2>
        </div>
        {party.members.length === 0 ? (
          <p className="px-5 py-8 text-center text-muted-foreground text-sm">No members yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {party.members.map((m) => (
              <div key={m.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/members/${m.id}`}
                    className="font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {m.displayName}
                  </Link>
                  <span className="text-muted-foreground text-sm">@{m.username}</span>
                  <Badge variant="outline" className="text-xs">
                    {ROLE_LABELS[m.role] ?? m.role}
                  </Badge>
                  {m.grade && (
                    <Badge variant="outline" className={`text-xs font-bold ${GRADE_COLORS[m.grade] ?? ""}`}>
                      {m.grade}
                    </Badge>
                  )}
                </div>
                {isMC && <RemoveMemberClientButton partyId={id} userId={m.id} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

