"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EvaluationDialog } from "@/components/evaluations/evaluation-dialog";
import { AudioPlayer } from "@/components/evaluations/audio-player";

interface Attendee { id: string; displayName: string }
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

interface Props {
  attendees: Attendee[];
  evaluations: Evaluation[];
  isAdmin: boolean;
  currentUserId: string;
  sessionId: string;
  kalaams: { id: string; title: string }[];
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
  kalaams,
}: Props) {
  // Keyed by `${userId}_${kalaamId}`
  const [localEvals, setLocalEvals] = useState<Map<string, Evaluation>>(
    new Map(evaluations.map((e) => [`${e.userId}_${e.kalaamId ?? ""}`, e]))
  );
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  function onEvalSaved(kalaamId: string, evaluation: Evaluation) {
    setLocalEvals((prev) => new Map(prev).set(`${evaluation.userId}_${kalaamId}`, evaluation));
  }

  function buildUserEvalMap(userId: string): Map<string, Evaluation> {
    const map = new Map<string, Evaluation>();
    for (const k of kalaams) {
      const ev = localEvals.get(`${userId}_${k.id}`);
      if (ev) map.set(k.id, ev);
    }
    return map;
  }

  return (
    <>
      <div className="divide-y divide-border">
        {attendees.map((attendee) => {
          const canSee = isAdmin || attendee.id === currentUserId;
          const userEvalMap = buildUserEvalMap(attendee.id);

          return (
            <div key={attendee.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <span className="text-foreground font-medium">{attendee.displayName}</span>

                  {canSee ? (
                    <div className="mt-2 space-y-3">
                      {kalaams.map((k) => {
                        const ev = userEvalMap.get(k.id);
                        return (
                          <div key={k.id}>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-muted-foreground text-xs font-medium">{k.title}</span>
                              {ev?.voiceRange && (
                                <Badge variant="secondary" className="text-xs">{ev.voiceRange}</Badge>
                              )}
                            </div>
                            {ev ? (
                              <div className="flex items-center gap-3 flex-wrap pl-2 mt-1">
                                <StarRating value={ev.ranking} />
                                {ev.notes && (
                                  <span className="text-muted-foreground text-xs">"{ev.notes}"</span>
                                )}
                                {ev.audioFileKey && (
                                  <AudioPlayer fileKey={ev.audioFileKey} fileName={ev.audioFileName ?? undefined} />
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs pl-2">Not evaluated</span>
                            )}
                          </div>
                        );
                      })}
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
                    {userEvalMap.size > 0 ? "Edit" : "Evaluate"}
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
          kalaams={kalaams}
          existingEvals={buildUserEvalMap(editingUserId)}
          onSaved={onEvalSaved}
          onClose={() => setEditingUserId(null)}
        />
      )}
    </>
  );
}
