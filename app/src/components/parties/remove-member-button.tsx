"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Props {
  partyId: string;
  userId: string;
}

export function RemoveMemberClientButton({ partyId, userId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    setLoading(true);
    try {
      const res = await fetch(`/api/parties/${partyId}/members?userId=${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to remove member");
        return;
      }
      toast.success("Member removed");
      router.refresh();
    } catch {
      toast.error("Error removing member");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
      onClick={handleRemove}
      disabled={loading}
    >
      {loading ? "…" : "Remove"}
    </Button>
  );
}
