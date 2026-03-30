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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface MajlisData {
  id: string;
  date: string;
  occasion?: string | null;
  notes?: string | null;
}

interface Props {
  majlis: MajlisData;
}

export function MajlisActions({ majlis }: Props) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const date = fd.get("date") as string;
    const occasion = (fd.get("occasion") as string).trim() || null;
    const notes = (fd.get("notes") as string).trim() || null;

    setLoading(true);
    try {
      const res = await fetch(`/api/majlis/${majlis.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: new Date(date).toISOString(), occasion, notes }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to update");
        return;
      }
      toast.success("Majlis updated");
      setEditOpen(false);
      router.refresh();
    } catch {
      toast.error("Error updating Majlis");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/majlis/${majlis.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to delete");
        return;
      }
      toast.success("Majlis deleted");
      router.push("/majlis");
      router.refresh();
    } catch {
      toast.error("Error deleting Majlis");
    } finally {
      setLoading(false);
    }
  }

  const dateValue = new Date(majlis.date).toISOString().split("T")[0];

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
        Edit
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setDeleteConfirm(true)}
      >
        Delete
      </Button>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Majlis</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input name="date" type="date" required defaultValue={dateValue} />
            </div>
            <div className="space-y-1.5">
              <Label>Occasion</Label>
              <Input name="occasion" defaultValue={majlis.occasion ?? ""} placeholder="e.g. Chehlum 1446 AH" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea name="notes" defaultValue={majlis.notes ?? ""} rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Majlis?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-2">
            This will permanently delete the Majlis and its entire setlist. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
