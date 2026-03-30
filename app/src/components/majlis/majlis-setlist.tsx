"use client";

import { Badge } from "@/components/ui/badge";
import { AssignKalaamDialog } from "@/components/majlis/assign-kalaam-dialog";
import { AddKaalaamsDialog } from "@/components/majlis/add-kalaams-dialog";

interface Assignee {
  id: string;
  displayName: string;
  username: string;
  partyName?: string | null;
  /** partyId used to determine PC edit rights per kalaam */
  partyId?: string | null;
}

interface KalaamRow {
  kalaamId: string;
  kalaamTitle: string;
  assignees: Assignee[];
}

interface Member {
  id: string;
  displayName: string;
  username: string;
  partyName?: string | null;
  isReady: boolean;
}

interface PartyGroup {
  partyName: string;
  members: Member[];
}

interface AllKalaam {
  id: string;
  title: string;
  category: string;
}

interface Props {
  majlisId: string;
  kalaams: KalaamRow[];
  allKalaams?: AllKalaam[]; // for MC to manage setlist
  /** MC grouped data */
  partyGroups?: PartyGroup[];
  individuals?: Member[];
  /** PC own party */
  ownPartyMembers?: Member[];
  canManageSetlist: boolean; // MC
  /** true = MC (can assign any kalaam), false = PC (can only assign kalaams where their party/self is already listed) */
  canAssignAny: boolean;
  canAssignParty: boolean;
  /** PC's party ID — used to gate per-row assign button */
  pcPartyId?: string | null;
  /** PC's own user ID */
  pcUserId?: string;
}

export function MajlisSetlist({
  majlisId,
  kalaams,
  allKalaams,
  partyGroups,
  individuals,
  ownPartyMembers,
  canManageSetlist,
  canAssignAny,
  canAssignParty,
  pcPartyId,
  pcUserId,
}: Props) {
  if (kalaams.length === 0 && !canManageSetlist) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No kalaams in this Majlis yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {canManageSetlist && allKalaams && (
        <div className="flex justify-end">
          <AddKaalaamsDialog
            majlisId={majlisId}
            allKalaams={allKalaams}
            currentKalaamIds={kalaams.map((k) => k.kalaamId)}
          />
        </div>
      )}

      {kalaams.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No kalaams added yet. Use the button above to add kalaams to this Majlis.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg divide-y divide-border overflow-hidden">
          {kalaams.map((k, idx) => {
            // Group assignees by partyName
            const partyMap = new Map<string, Assignee[]>();
            for (const a of k.assignees) {
              const key = a.partyName ?? "Individuals";
              if (!partyMap.has(key)) partyMap.set(key, []);
              partyMap.get(key)!.push(a);
            }

            // PC can only assign if their party or themselves is already listed on this kalaam
            const pcCanAssignThisKalaam =
              canAssignParty &&
              !canAssignAny &&
              k.assignees.some(
                (a) =>
                  (pcPartyId && a.partyId === pcPartyId) ||
                  (pcUserId && a.id === pcUserId)
              );

            const showAssign = canAssignAny || pcCanAssignThisKalaam;

            return (
              <div key={k.kalaamId} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono shrink-0">
                        {idx + 1}.
                      </span>
                      <span className="font-medium text-foreground truncate">{k.kalaamTitle}</span>
                    </div>

                    {k.assignees.length === 0 ? (
                      <p className="text-muted-foreground text-xs mt-1.5 ml-5">— TBA —</p>
                    ) : (
                      <div className="mt-2 ml-5 space-y-1.5">
                        {Array.from(partyMap.entries()).map(([partyName, members]) => (
                          <div key={partyName} className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs text-muted-foreground font-medium">
                              {partyName}:
                            </span>
                            {members.map((a) => (
                              <Badge key={a.id} variant="secondary" className="text-xs">
                                {a.displayName}
                              </Badge>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {showAssign && (
                    <AssignKalaamDialog
                      majlisId={majlisId}
                      kalaamId={k.kalaamId}
                      kalaamTitle={k.kalaamTitle}
                      partyGroups={partyGroups}
                      individuals={individuals}
                      ownPartyMembers={ownPartyMembers}
                      currentAssigneeIds={k.assignees.map((a) => a.id)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
