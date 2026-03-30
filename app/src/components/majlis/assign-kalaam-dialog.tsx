"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface Member {
  id: string;
  displayName: string;
  username: string;
  partyName?: string | null;
  isReady: boolean; // lehenDone && hifzDone
}

interface PartyGroup {
  partyName: string;
  members: Member[];
}

interface Props {
  majlisId: string;
  kalaamId: string;
  kalaamTitle: string;
  /** For MC: grouped by party + individuals section */
  partyGroups?: PartyGroup[];
  individuals?: Member[];
  /** For PC: flat list of own party members */
  ownPartyMembers?: Member[];
  currentAssigneeIds: string[];
  trigger?: React.ReactNode;
}

export function AssignKalaamDialog({
  majlisId,
  kalaamId,
  kalaamTitle,
  partyGroups,
  individuals,
  ownPartyMembers,
  currentAssigneeIds,
  trigger,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(currentAssigneeIds));
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  function toggleMember(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch(`/api/majlis/${majlisId}/kalaams/${kalaamId}/assignees`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: Array.from(selected) }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to update assignees");
        return;
      }
      toast.success("Assignees updated");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Error updating assignees");
    } finally {
      setLoading(false);
    }
  }

  function renderMember(m: Member) {
    const isSelected = selected.has(m.id);
    const q = search.trim().toLowerCase();
    if (q && !m.displayName.toLowerCase().includes(q) && !m.username.toLowerCase().includes(q)) {
      return null;
    }
    return (
      <button
        key={m.id}
        type="button"
        className={`w-full text-left px-4 py-2.5 hover:bg-accent transition-colors flex items-center justify-between gap-2 ${
          isSelected ? "bg-accent" : ""
        }`}
        onClick={() => toggleMember(m.id)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium truncate">{m.displayName}</span>
          <span className="text-muted-foreground text-xs">@{m.username}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {m.isReady && (
            <Badge variant="outline" className="text-xs border-green-600 text-green-600">✓ Ready</Badge>
          )}
          {isSelected && (
            <Badge variant="default" className="text-xs">Selected</Badge>
          )}
        </div>
      </button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="outline" size="sm">Assign</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign — {kalaamTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-1.5 mt-2">
          <Label>Search</Label>
          <Input
            placeholder="Name or username…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="border border-border rounded-md overflow-y-auto flex-1 mt-3 divide-y divide-border">
          {/* MC mode: grouped */}
          {partyGroups && partyGroups.map((group) => {
            const visibleMembers = group.members.filter((m) => {
              const q = search.trim().toLowerCase();
              return !q || m.displayName.toLowerCase().includes(q) || m.username.toLowerCase().includes(q);
            });
            if (visibleMembers.length === 0) return null;
            const allSelected = visibleMembers.every((m) => selected.has(m.id));
            return (
              <div key={group.partyName}>
                <div className="px-4 py-1.5 bg-muted/50 flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {group.partyName}
                  </span>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => {
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (allSelected) visibleMembers.forEach((m) => next.delete(m.id));
                        else visibleMembers.forEach((m) => next.add(m.id));
                        return next;
                      });
                    }}
                  >
                    {allSelected ? "Deselect All" : "Select All"}
                  </button>
                </div>
                {visibleMembers.map(renderMember)}
              </div>
            );
          })}
          {individuals && individuals.length > 0 && (
            <div>
              <div className="px-4 py-1.5 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Individuals
              </div>
              {individuals.map(renderMember)}
            </div>
          )}

          {/* PC mode: flat */}
          {ownPartyMembers && ownPartyMembers.map(renderMember)}
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-border mt-2">
          <span className="text-sm text-muted-foreground">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving…" : "Save Assignees"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
