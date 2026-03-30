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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Member {
  id: string;
  displayName: string;
  username: string;
  role: string;
}

interface Props {
  partyId: string;
  /** Available members to add (IMs for MC, or all active for PC) */
  availableMembers: Member[];
  trigger?: React.ReactNode;
}

export function AssignMemberDialog({ partyId, availableMembers, trigger }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const filtered = availableMembers.filter(
    (m) =>
      m.displayName.toLowerCase().includes(search.toLowerCase()) ||
      m.username.toLowerCase().includes(search.toLowerCase())
  );

  async function handleAdd() {
    if (!selectedId) {
      toast.error("Select a member to add");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/parties/${partyId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedId }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to add member");
        return;
      }
      toast.success("Member added to party");
      setOpen(false);
      setSelectedId("");
      setSearch("");
      router.refresh();
    } catch {
      toast.error("Error adding member");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="outline" size="sm">+ Add Member</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Member to Party</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Search</Label>
            <Input
              placeholder="Name or username…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="border border-border rounded-md overflow-y-auto max-h-60 divide-y divide-border">
            {filtered.length === 0 ? (
              <p className="text-muted-foreground text-sm px-4 py-3 text-center">No members found</p>
            ) : (
              filtered.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`w-full text-left px-4 py-2.5 hover:bg-accent transition-colors text-sm ${
                    selectedId === m.id ? "bg-accent" : ""
                  }`}
                  onClick={() => setSelectedId(m.id)}
                >
                  <span className="font-medium">{m.displayName}</span>
                  <span className="text-muted-foreground ml-1">@{m.username}</span>
                  <span className="ml-2 text-xs text-muted-foreground">({m.role})</span>
                </button>
              ))
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={loading || !selectedId}>
              {loading ? "Adding…" : "Add Member"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
