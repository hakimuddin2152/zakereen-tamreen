"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface FeedbackAuthor {
  id: string;
  displayName: string;
  role: string;
}

interface Feedback {
  id: string;
  authorId: string;
  comment: string | null;
  ranking: number | null;
  createdAt: string | Date;
  author: FeedbackAuthor;
}

interface Props {
  kalaamId: string;
  recordingId: string;
  isCoordinator: boolean;
  initialFeedbacks: Feedback[];
}

function StarRating({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(value === s ? null : s)}
          className={`text-lg leading-none transition-colors ${
            value !== null && s <= value
              ? "text-yellow-400"
              : "text-muted-foreground/30 hover:text-yellow-400/60"
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function RecordingFeedbackPanel({
  kalaamId,
  recordingId,
  isCoordinator,
  initialFeedbacks,
}: Props) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(initialFeedbacks);
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState("");
  const [ranking, setRanking] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!comment.trim()) {
      toast.error("Comment is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/kalaams/${kalaamId}/recordings/${recordingId}/feedback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comment: comment.trim(), ranking }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to submit feedback");
        return;
      }
      const saved: Feedback = await res.json();
      setFeedbacks((prev) => {
        const idx = prev.findIndex((f) => f.authorId === saved.authorId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [...prev, saved];
      });
      setComment("");
      setRanking(null);
      setExpanded(false);
      toast.success("Feedback submitted");
    } catch {
      toast.error("Error submitting feedback");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-2 space-y-2">
      {/* Existing feedbacks */}
      {feedbacks.length > 0 && (
        <div className="space-y-2">
          {feedbacks.map((f) => (
            <div
              key={f.id}
              className="rounded border border-border bg-muted/40 px-3 py-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-medium text-foreground">{f.author.displayName}</span>
                <div className="flex items-center gap-2">
                  {f.ranking !== null && (
                    <span className="text-yellow-400">
                      {"★".repeat(f.ranking)}
                      <span className="text-muted-foreground/30">
                        {"★".repeat(5 - f.ranking)}
                      </span>
                    </span>
                  )}
                  <span className="text-muted-foreground">{formatDate(f.createdAt)}</span>
                </div>
              </div>
              {f.comment && (
                <p className="text-muted-foreground whitespace-pre-wrap">{f.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Coordinator: add/edit feedback */}
      {isCoordinator && (
        <>
          {!expanded ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-2"
              onClick={() => setExpanded(true)}
            >
              {feedbacks.some((f) => f.author.id === undefined) ? "Edit feedback" : "+ Give feedback"}
            </Button>
          ) : (
            <div className="space-y-2 rounded border border-border p-3 bg-muted/20">
              <StarRating value={ranking} onChange={setRanking} />
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Your feedback…"
                rows={3}
                className="resize-none text-sm"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? "Saving…" : "Submit"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
