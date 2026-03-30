import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { can, Permission } from "@/lib/permissions";
import { formatDate } from "@/lib/utils-date";
import { Badge } from "@/components/ui/badge";
import { MajlisSetlist } from "@/components/majlis/majlis-setlist";
import { MajlisActions } from "@/components/majlis/majlis-actions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MajlisDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const role = session?.user?.role ?? "";
  const userId = session?.user?.id ?? "";

  const canManageSetlist = can(role, Permission.MAJLIS_CREATE); // MC
  const canAssignAny = can(role, Permission.MAJLIS_ASSIGN_ANY); // MC
  const canAssignParty = can(role, Permission.MAJLIS_ASSIGN_PARTY); // PC
  const canEdit = can(role, Permission.MAJLIS_EDIT); // MC

  const majlis = await db.majlis.findUnique({
    where: { id },
    include: {
      kalaams: {
        orderBy: { id: "asc" },
        include: {
          kalaam: { select: { id: true, title: true } },
          assignees: {
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  username: true,
                  partyId: true,
                  party: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!majlis) notFound();

  // Build setlist rows for MajlisSetlist component
  const kalaamRows = majlis.kalaams.map((mk) => ({
    kalaamId: mk.kalaam.id,
    kalaamTitle: mk.kalaam.title,
    assignees: mk.assignees.map((a) => ({
      id: a.user.id,
      displayName: a.user.displayName,
      username: a.user.username,
      partyName: a.user.party?.name ?? null,
      partyId: a.user.partyId ?? null,
    })),
  }));

  // For all kalaams library (MC setlist management)
  const allKalaams = canManageSetlist
    ? await db.kalaam.findMany({
        select: { id: true, title: true, category: true },
        orderBy: { title: "asc" },
      })
    : [];

  // For assign dialog — MC gets all members grouped by party
  type MemberEntry = { id: string; displayName: string; username: string; partyName: string | null; isReady: boolean };
  type PartyGroup = { partyName: string; members: MemberEntry[] };

  let partyGroups: PartyGroup[] | undefined;
  let individuals: MemberEntry[] | undefined;
  let ownPartyMembers: MemberEntry[] | undefined;
  let pcPartyId: string | null = null;

  if (canAssignAny) {
    // MC: fetch all active members with their kalaam prerequisites
    const allMembers = await db.user.findMany({
      where: { isActive: true, role: { not: "GOD" } },
      include: {
        party: { select: { id: true, name: true } },
        prerequisites: { select: { lehenDone: true, hifzDone: true } },
      },
      orderBy: { displayName: "asc" },
    });

    const grouped = new Map<string, PartyGroup>();
    const ind: MemberEntry[] = [];

    for (const m of allMembers) {
      const isReady = m.prerequisites.some((k) => k.lehenDone && k.hifzDone);
      const entry: MemberEntry = {
        id: m.id,
        displayName: m.displayName,
        username: m.username,
        partyName: m.party?.name ?? null,
        isReady,
      };
      if (m.party) {
        if (!grouped.has(m.party.id)) {
          grouped.set(m.party.id, { partyName: m.party.name, members: [] });
        }
        grouped.get(m.party.id)!.members.push(entry);
      } else {
        ind.push(entry);
      }
    }
    partyGroups = Array.from(grouped.values());
    individuals = ind;
  } else if (canAssignParty) {
    // PC: only own party members
    const myParty = await db.party.findUnique({
      where: { coordinatorId: userId },
      select: { id: true },
    });
    pcPartyId = myParty?.id ?? null;
    if (myParty) {
      const members = await db.user.findMany({
        where: { isActive: true, partyId: myParty.id },
        include: { prerequisites: { select: { lehenDone: true, hifzDone: true } } },
        orderBy: { displayName: "asc" },
      });
      ownPartyMembers = members.map((m) => ({
        id: m.id,
        displayName: m.displayName,
        username: m.username,
        partyName: null,
        isReady: m.prerequisites.some((k) => k.lehenDone && k.hifzDone),
      }));
    }
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-mono text-muted-foreground mb-1">
              {formatDate(majlis.date)}
            </p>
            <h1 className="text-2xl font-bold text-foreground">
              {majlis.occasion ?? "Majlis"}
            </h1>
            {majlis.notes && (
              <p className="text-muted-foreground text-sm mt-1">{majlis.notes}</p>
            )}
            <Badge variant="secondary" className="mt-2 text-xs">
              {majlis.kalaams.length} kalaam{majlis.kalaams.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          {canEdit && (
            <MajlisActions
              majlis={{
                id: majlis.id,
                date: majlis.date.toISOString(),
                occasion: majlis.occasion,
                notes: majlis.notes,
              }}
            />
          )}
        </div>
      </div>

      <MajlisSetlist
        majlisId={id}
        kalaams={kalaamRows}
        allKalaams={canManageSetlist ? allKalaams : undefined}
        partyGroups={partyGroups}
        individuals={individuals}
        ownPartyMembers={ownPartyMembers}
        canManageSetlist={canManageSetlist}
        canAssignAny={canAssignAny}
        canAssignParty={canAssignParty}
        pcPartyId={pcPartyId}
        pcUserId={canAssignParty && !canAssignAny ? userId : undefined}
      />
    </div>
  );
}
