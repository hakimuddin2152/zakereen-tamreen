"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface Evaluation {
  id: string;
  ranking: number | null;
  voiceRange: string | null;
  notes: string | null;
}

interface Props {
  kalaamId: string;
  memberId: string;
  memberName: string;
  existingEval: Evaluation | null;
  trigger?: React.ReactNode;
}

function StarSelector({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? 0 : n)}
          className={`text-2xl transition-colors ${n <= value ? "text-yellow-400" : "text-muted-foreground hover:text-yellow-500"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function KalaamMemberEvalDialog({ kalaamId, memberId, memberName, existingEval, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [ranking, setRanking] = useState<number>(existingEval?.ranking ?? 0);
  const [voiceRange, setVoiceRange] = useState(existingEval?.voiceRange ?? "");
  const [notes, setNotes] = useState(existingEval?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [localEval, setLocalEval] = useState<Evaluation | null>(existingEval);

  function handleOpen() {
    setRanking(localEval?.ranking ?? 0);
    setVoiceRange(localEval?.voiceRange ?? "");
    setNotes(localEval?.notes ?? "");
    setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/kalaams/${kalaamId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: memberId,
          ranking: ranking || null,
          voiceRange: voiceRange.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        let msg = "Failed to save evaluation";
        try { const err = await res.json(); msg = err.error || msg; } catch {}
        toast.error(msg);
        return;
      }
      const saved: Evaluation = await res.json();
      setLocalEval(saved);
      toast.success("Evaluation saved");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving evaluation");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {trigger ? (
        <span onClick={handleOpen} className="cursor-pointer">{trigger}</span>
      ) : (
        <Button variant="outline" size="sm" onClick={handleOpen}>
          {localEval ? "Edit Evaluation" : "Evaluate"}
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Evaluate {memberName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Rating</Label>
              <StarSelector value={ranking} onChange={setRanking} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="voiceRange">Voice Range</Label>
              <Input
                id="voiceRange"
                placeholder="e.g. E3–C5"
                value={voiceRange}
                onChange={(e) => setVoiceRange(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="evalNotes">Notes</Label>
              <Textarea
                id="evalNotes"
                placeholder="Optional feedback notes…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            {localEval && (
              <div className="rounded-md border border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
                <p className="font-medium text-foreground text-sm">Current evaluation</p>
                {localEval.ranking && <p>Rating: {"★".repeat(localEval.ranking)}{"☆".repeat(5 - localEval.ranking)}</p>}
                {localEval.voiceRange && <p>Voice range: {localEval.voiceRange}</p>}
                {localEval.notes && <p>Notes: {localEval.notes}</p>}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Evaluation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
