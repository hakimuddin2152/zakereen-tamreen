"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Props {
  id: string;
  title: string;
  sessionCount: number;
}

export function DeleteKalaamButton({ id, title, sessionCount }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/kalaam?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
      toast.success("Kalaam deleted");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error deleting kalaam");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="border-destructive/50 text-destructive hover:bg-destructive/10 shrink-0"
      >
        Delete
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Kalaam</DialogTitle>
            <DialogDescription>
              {sessionCount > 0
                ? `"${title}" is used in ${sessionCount} session${sessionCount !== 1 ? "s" : ""} and cannot be deleted.`
                : `Are you sure you want to delete "${title}"? This cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            {sessionCount === 0 && (
              <Button
                onClick={handleDelete}
                disabled={loading}
                variant="destructive"
              >
                {loading ? "Deleting…" : "Delete"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
