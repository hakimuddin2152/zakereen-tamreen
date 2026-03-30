"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils-date";

interface EvalRequest {
  id: string;
  requestedAt: string;
  status: string;
  notes?: string | null;
  user: { id: string; displayName: string; username: string };
  kalaam: { id: string; title: string };
}

interface Props {
  requests: EvalRequest[];
}

export function EvalRequestsTable({ requests }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<EvalRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [ranking, setRanking] = useState<string>("");
  const [voiceRange, setVoiceRange] = useState("");
  const [evalNotes, setEvalNotes] = useState("");

  function openEval(req: EvalRequest) {
    setSelected(req);
    setRanking("");
    setVoiceRange("");
    setEvalNotes("");
  }

  async function handleSubmit() {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/eval-requests/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "EVALUATED",
          ranking: ranking ? parseInt(ranking) : undefined,
          voiceRange: voiceRange || undefined,
          evalNotes: evalNotes || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to submit evaluation");
        return;
      }
      toast.success("Evaluation submitted");
      setSelected(null);
      router.refresh();
    } catch {
      toast.error("Error submitting evaluation");
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/eval-requests/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED", evalNotes: evalNotes || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to reject request");
        return;
      }
      toast.success("Request rejected");
      setSelected(null);
      router.refresh();
    } catch {
      toast.error("Error");
    } finally {
      setLoading(false);
    }
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">No pending evaluation requests.</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card border border-border rounded-lg overflow-hidden divide-y divide-border">
        {requests.map((req) => (
          <div key={req.id} className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-foreground">{req.user.displayName}</span>
                <span className="text-muted-foreground text-sm">@{req.user.username}</span>
                <Badge variant="secondary" className="text-xs">{req.kalaam.title}</Badge>
              </div>
              <p className="text-muted-foreground text-xs mt-1">
                Requested {formatDate(new Date(req.requestedAt))}
                {req.notes && <span> · "{req.notes}"</span>}
              </p>
            </div>
            <Button size="sm" onClick={() => openEval(req)}>
              Evaluate
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Evaluate: {selected?.kalaam.title}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">
                Member: <span className="text-foreground font-medium">{selected.user.displayName}</span>
              </p>

              <div className="space-y-1.5">
                <Label>Ranking (1–5)</Label>
                <Select value={ranking} onValueChange={setRanking}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select ranking…" />
                  </SelectTrigger>
                  <SelectContent>
                    {["1", "2", "3", "4", "5"].map((v) => (
                      <SelectItem key={v} value={v}>{"★".repeat(Number(v))} ({v}/5)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Voice Range</Label>
                <Input
                  placeholder="e.g. High-pitched soprano"
                  value={voiceRange}
                  onChange={(e) => setVoiceRange(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Evaluation notes…"
                  value={evalNotes}
                  onChange={(e) => setEvalNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 flex-wrap">
                <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={loading}
                >
                  Reject
                </Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? "Saving…" : "Submit Evaluation"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
