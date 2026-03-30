"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Props {
  kalaamId: string;
  lehenDone: boolean;
  hifzDone: boolean;
  /** True if the user has at least one voice recording for this kalaam */
  hasRecording: boolean;
  /** PC or MC — recording is optional for coordinators */
  isCoordinator: boolean;
  /** True if there is already a PENDING request for this kalaam */
  isPending: boolean;
}

export function EvalRequestButton({
  kalaamId,
  lehenDone,
  hifzDone,
  hasRecording,
  isCoordinator,
  isPending,
}: Props) {
  const canRequest = lehenDone && hifzDone && (isCoordinator || hasRecording);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(isPending);

  if (!canRequest) return null;

  if (pending) {
    return (
      <Button variant="outline" size="sm" disabled className="text-muted-foreground">
        Evaluation Pending
      </Button>
    );
  }

  async function handleRequest() {
    setLoading(true);
    try {
      const res = await fetch("/api/eval-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kalaamId }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to submit request");
        return;
      }
      toast.success("Evaluation request submitted");
      setPending(true);
    } catch {
      toast.error("Error submitting request");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleRequest} disabled={loading}>
      {loading ? "Submitting…" : "Request Evaluation"}
    </Button>
  );
}
