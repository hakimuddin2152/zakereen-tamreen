"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EvaluationDialog } from "@/components/evaluations/evaluation-dialog";
import { AudioPlayer } from "@/components/evaluations/audio-player";

interface Attendee { id: string; displayName: string }
interface Evaluation {
  id: string;
  userId: string;
  ranking: number | null;
  voiceRange: string | null;
  audioFileKey: string | null;
  audioFileName: string | null;
  notes: string | null;
}

interface Props {
  attendees: Attendee[];
  evaluations: Evaluation[];
  isAdmin: boolean;
  currentUserId: string;
  sessionId: string;
}

function StarRating({ value }: { value: number | null }) {
  if (!value) return <span className="text-muted-foreground text-sm">—</span>;
  return (
    <span className="text-yellow-400 text-sm">
      {"★".repeat(value)}
      <span className="text-muted-foreground/30">{"★".repeat(5 - value)}</span>
    </span>
  );
}

export function EvaluationTable({
  attendees,
  evaluations,
  isAdmin,
  currentUserId,
  sessionId,
}: Props) {
  const [localEvals, setLocalEvals] = useState<Map<string, Evaluation>>(
    new Map(evaluations.map((e) => [e.userId, e]))
  );
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  function onEvalSaved(evaluation: Evaluation) {
    setLocalEvals((prev) => new Map(prev).set(evaluation.userId, evaluation));
    setEditingUserId(null);
  }

  return (
    <>
      <div className="divide-y divide-border">
        {attendees.map((attendee) => {
          const canSee = isAdmin || attendee.id === currentUserId;
          const ev = localEvals.get(attendee.id);

          return (
            <div key={attendee.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-foreground font-medium">{attendee.displayName}</span>
                    {ev?.voiceRange && (
                      <Badge variant="secondary" className="text-xs">
                        {ev.voiceRange}
                      </Badge>
                    )}
                  </div>

                  {canSee ? (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <StarRating value={ev?.ranking ?? null} />
                        {ev?.notes && (
                          <span className="text-muted-foreground text-xs">"{ev.notes}"</span>
                        )}
                      </div>
                      {ev?.audioFileKey && (
                        <AudioPlayer
                          fileKey={ev.audioFileKey}
                          fileName={ev.audioFileName ?? undefined}
                        />
                      )}
                      {!ev?.audioFileKey && (
                        <span className="text-muted-foreground text-xs">No recording uploaded</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs mt-1">
                      (Details visible to admin and the reciter)
                    </p>
                  )}
                </div>

                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingUserId(attendee.id)}
                    className="shrink-0"
                  >
                    {ev ? "Edit" : "Evaluate"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editingUserId && (
        <EvaluationDialog
          sessionId={sessionId}
          userId={editingUserId}
          userName={attendees.find((a) => a.id === editingUserId)?.displayName ?? ""}
          existing={localEvals.get(editingUserId) ?? null}
          onSaved={onEvalSaved}
          onClose={() => setEditingUserId(null)}
        />
      )}
    </>
  );
}
