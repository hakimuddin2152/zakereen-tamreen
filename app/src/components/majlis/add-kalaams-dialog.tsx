"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { KalaamBrowser } from "@/components/kalaams/kalaam-browser";

interface Kalaam {
  id: string;
  title: string;
  category: string;
}

interface Props {
  majlisId: string;
  allKalaams: Kalaam[];
  currentKalaamIds: string[];
  trigger?: React.ReactNode;
}

export function AddKaalaamsDialog({ majlisId, allKalaams, currentKalaamIds, trigger }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(currentKalaamIds));
  const [loading, setLoading] = useState(false);

  function toggleKalaam(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch(`/api/majlis/${majlisId}/kalaams`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kalaamIds: Array.from(selected) }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to update setlist");
        return;
      }
      toast.success("Setlist updated");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Error updating setlist");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="outline">+ Add Kalaams</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Kalaams for Setlist</DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          <KalaamBrowser
            kalaams={allKalaams}
            selectable
            selectedIds={selected}
            onToggle={toggleKalaam}
          />
        </div>
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
          <span className="text-sm text-muted-foreground">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving…" : "Save Setlist"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
