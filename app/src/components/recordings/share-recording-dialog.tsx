"use client";

import { useState } from "react";
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
}

interface Props {
  kalaamId: string;
  recordingId: string;
  members: Member[];
  sharedWith: string[]; // userIds already shared with
  trigger?: React.ReactNode;
}

export function ShareRecordingDialog({
  kalaamId,
  recordingId,
  members,
  sharedWith,
  trigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sharedIds, setSharedIds] = useState<Set<string>>(new Set(sharedWith));
  const [loading, setLoading] = useState<string | null>(null); // userId being toggled

  const filtered = members.filter(
    (m) =>
      m.displayName.toLowerCase().includes(search.toLowerCase()) ||
      m.username.toLowerCase().includes(search.toLowerCase())
  );

  async function toggleShare(userId: string) {
    const isShared = sharedIds.has(userId);
    setLoading(userId);
    try {
      if (isShared) {
        const res = await fetch(
          `/api/kalaams/${kalaamId}/recordings/${recordingId}/share/${userId}`,
          { method: "DELETE" }
        );
        if (!res.ok) throw new Error();
        setSharedIds((prev) => { const n = new Set(prev); n.delete(userId); return n; });
        toast.success("Recording unshared");
      } else {
        const res = await fetch(
          `/api/kalaams/${kalaamId}/recordings/${recordingId}/share`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userIds: [userId] }),
          }
        );
        if (!res.ok) throw new Error();
        setSharedIds((prev) => new Set([...prev, userId]));
        toast.success("Recording shared");
      }
    } catch {
      toast.error("Failed to update sharing");
    } finally {
      setLoading(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm">
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Recording</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="space-y-1.5">
            <Label>Search members</Label>
            <Input
              placeholder="Name or username…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="border border-border rounded-md overflow-y-auto max-h-64 divide-y divide-border">
            {filtered.length === 0 ? (
              <p className="text-muted-foreground text-sm px-4 py-3 text-center">No members found</p>
            ) : (
              filtered.map((m) => {
                const shared = sharedIds.has(m.id);
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-4 py-2.5 gap-2"
                  >
                    <div>
                      <span className="text-sm font-medium">{m.displayName}</span>
                      <span className="text-muted-foreground text-xs ml-1">@{m.username}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {shared && <Badge variant="outline" className="text-xs text-primary border-primary">Shared</Badge>}
                      <Button
                        size="sm"
                        variant={shared ? "destructive" : "outline"}
                        disabled={loading === m.id}
                        onClick={() => toggleShare(m.id)}
                      >
                        {loading === m.id ? "…" : shared ? "Unshare" : "Share"}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
