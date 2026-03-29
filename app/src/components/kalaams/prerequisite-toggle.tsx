"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Props {
  kalaamId: string;
  field: "lehenDone" | "hifzDone";
  label: string;
  initialValue: boolean;
}

export function PrerequisiteToggle({ kalaamId, field, label, initialValue }: Props) {
  const router = useRouter();
  const [done, setDone] = useState(initialValue);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const next = !done;
    try {
      const res = await fetch("/api/prerequisites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kalaamId, [field]: next }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setDone(next);
      toast.success(`${label} marked as ${next ? "complete" : "incomplete"}`);
      // Bust the router cache so My Kalaams reflects the change immediately
      router.refresh();
    } catch {
      toast.error("Could not update prerequisite");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        variant={done ? "default" : "outline"}
        size="sm"
        onClick={toggle}
        disabled={loading}
        className="min-w-[120px]"
      >
        {done ? "✓ " : "✗ "}
        {label} {done ? "Done" : "Pending"}
      </Button>
    </div>
  );
}
