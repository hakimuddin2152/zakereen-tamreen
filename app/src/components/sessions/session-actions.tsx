"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { KalaamBrowser } from "@/components/kalaams/kalaam-browser";

interface Kalaam { id: string; title: string; category: string; recitedBy: string | null }
interface Reciter { id: string; displayName: string }

interface Props {
  sessionId: string;
  currentDate: string; // ISO date string yyyy-MM-dd
  currentNotes: string | null;
  currentKalaamIds: string[];
  currentAttendeeIds: string[];
  allKalaams: Kalaam[];
  allReciters: Reciter[];
}

export function SessionActions({
  sessionId,
  currentDate,
  currentNotes,
  currentKalaamIds,
  currentAttendeeIds,
  allKalaams,
  allReciters,
}: Props) {
  const router = useRouter();

  // Delete state
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editDate, setEditDate] = useState(currentDate);
  const [editNotes, setEditNotes] = useState(currentNotes ?? "");
  const [editKalaams, setEditKalaams] = useState<Set<string>>(new Set(currentKalaamIds));
  const [editAttendees, setEditAttendees] = useState<Set<string>>(new Set(currentAttendeeIds));

  function toggleKalaam(id: string) {
    setEditKalaams((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAttendee(id: string) {
    setEditAttendees((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function openEdit() {
    // Reset to current values each time
    setEditDate(currentDate);
    setEditNotes(currentNotes ?? "");
    setEditKalaams(new Set(currentKalaamIds));
    setEditAttendees(new Set(currentAttendeeIds));
    setEditOpen(true);
  }

  async function handleSave() {
    if (editKalaams.size === 0) { toast.error("Select at least one kalaam"); return; }
    if (editAttendees.size === 0) { toast.error("Select at least one attendee"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date(editDate).toISOString(),
          notes: editNotes || null,
          kalaamIds: Array.from(editKalaams),
          attendeeIds: Array.from(editAttendees),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Session updated");
      setEditOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to update session");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Session deleted");
      router.push("/sessions");
    } catch {
      toast.error("Failed to delete session");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  return (
    <div className="flex gap-2">
      {/* Edit */}
      <Button variant="outline" size="sm" onClick={openEdit}>
        Edit Session
      </Button>

      {/* Delete */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="border-destructive text-destructive hover:bg-destructive/10"
          >
            Delete Session
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
            <DialogDescription>
              This will permanently delete the session and all evaluations and audio recordings for it. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog (uncontrolled via state, not DialogTrigger) */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Session</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Kalaams * ({editKalaams.size} selected)</Label>
              <KalaamBrowser
                kalaams={allKalaams}
                selectable
                selectedIds={editKalaams}
                onToggle={toggleKalaam}
              />
            </div>

            <div className="space-y-2">
              <Label>Session Notes</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="General session notes…"
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Attendance * ({editAttendees.size} selected)</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {allReciters.map((r) => {
                  const checked = editAttendees.has(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleAttendee(r.id)}
                      className={`text-left px-3 py-2 rounded-md text-sm border transition-colors ${
                        checked
                          ? "bg-primary/20 border-primary text-primary"
                          : "bg-secondary border-border text-muted-foreground hover:border-foreground/30"
                      }`}
                    >
                      {checked ? "✓ " : ""}{r.displayName}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
