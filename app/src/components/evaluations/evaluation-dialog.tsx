"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AudioPlayer } from "@/components/evaluations/audio-player";

interface Evaluation {
  id: string;
  userId: string;
  kalaamId: string | null;
  ranking: number | null;
  voiceRange: string | null;
  audioFileKey: string | null;
  audioFileName: string | null;
  notes: string | null;
}

interface Recording {
  id: string;
  fileKey: string;
  fileName: string;
  createdAt: string | Date;
}

interface Props {
  sessionId: string;
  userId: string;
  userName: string;
  kalaams: { id: string; title: string }[];
  existingEvals: Map<string, Evaluation>; // keyed by kalaamId
  recordingsByKalaamId: Map<string, Recording[]>; // keyed by kalaamId
  onSaved: (kalaamId: string, ev: Evaluation) => void;
  onClose: () => void;
}

function StarSelector({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`text-2xl transition-colors ${
            n <= value ? "text-yellow-400" : "text-muted-foreground hover:text-yellow-500"
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function EvaluationDialog({
  sessionId,
  userId,
  userName,
  kalaams,
  existingEvals,
  recordingsByKalaamId,
  onSaved,
  onClose,
}: Props) {
  // Local copy of evals so dialog reflects updates without prop drilling
  const [localEvals, setLocalEvals] = useState<Map<string, Evaluation>>(() => new Map(existingEvals));
  const [selectedKalaamId, setSelectedKalaamId] = useState<string>(kalaams[0]?.id ?? "");

  const initEval = existingEvals.get(kalaams[0]?.id ?? "");
  const [ranking, setRanking] = useState<number>(initEval?.ranking ?? 0);
  const [notes, setNotes] = useState<string>(initEval?.notes ?? "");

  const [saving, setSaving] = useState(false);

  function handleKalaamChange(kalaamId: string) {
    const ev = localEvals.get(kalaamId);
    setSelectedKalaamId(kalaamId);
    setRanking(ev?.ranking ?? 0);
    setNotes(ev?.notes ?? "");
  }

  async function handleSave() {
    if (!selectedKalaamId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/evaluations/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kalaamId: selectedKalaamId,
          ranking: ranking || null,
          notes: notes || null,
          audioFileKey: null,
          audioFileName: null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save evaluation");
      const saved = await res.json();
      setLocalEvals((prev) => new Map(prev).set(selectedKalaamId, saved));
      onSaved(selectedKalaamId, saved);
      toast.success(
        `Saved — ${kalaams.find((k) => k.id === selectedKalaamId)?.title ?? "kalaam"}`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving");
    } finally {
      setSaving(false);
    }
  }

  const currentRecordings = recordingsByKalaamId.get(selectedKalaamId) ?? [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Evaluate — {userName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Kalaam</Label>
            <Select value={selectedKalaamId} onValueChange={handleKalaamChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select kalaam…" />
              </SelectTrigger>
              <SelectContent>
                {kalaams.map((k) => (
                  <SelectItem key={k.id} value={k.id}>
                    {k.title}
                    {localEvals.has(k.id) ? " ✓" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Practice recordings by this user for the selected kalaam */}
          <div className="space-y-2">
            <Label>Practice Recordings by {userName}</Label>
            {currentRecordings.length === 0 ? (
              <p className="text-muted-foreground text-xs">No recordings uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {currentRecordings.map((r, i) => (
                  <div key={r.id} className="rounded-md border border-border bg-secondary/30 px-3 py-2 space-y-1">
                    <span className="text-xs text-muted-foreground">
                      #{currentRecordings.length - i} · {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                    <AudioPlayer fileKey={r.fileKey} fileName={r.fileName} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Ranking</Label>
            <StarSelector value={ranking} onChange={setRanking} />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Feedback notes…"
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handleSave} disabled={saving || !selectedKalaamId}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
