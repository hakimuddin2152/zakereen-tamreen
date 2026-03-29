"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = [
  { value: "MARASIYA", label: "Marasiya" },
  { value: "SALAAM", label: "Salaam" },
  { value: "MADEH", label: "Madeh" },
  { value: "MISC", label: "Misc" },
] as const;

interface Kalaam {
  id: string;
  title: string;
  category: string;
  recitedBy?: string | null;
  pdfLink?: string | null;
  highestNote?: string | null;
  lowestNote?: string | null;
}

interface Props {
  kalaam: Kalaam;
}

export function EditKalaamDialog({ kalaam }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(kalaam.title);
  const [category, setCategory] = useState(kalaam.category);
  const [recitedBy, setRecitedBy] = useState(kalaam.recitedBy ?? "");
  const [pdfLink, setPdfLink] = useState(kalaam.pdfLink ?? "");
  const [highestNote, setHighestNote] = useState(kalaam.highestNote ?? "");
  const [lowestNote, setLowestNote] = useState(kalaam.lowestNote ?? "");

  function reset() {
    setTitle(kalaam.title);
    setCategory(kalaam.category);
    setRecitedBy(kalaam.recitedBy ?? "");
    setPdfLink(kalaam.pdfLink ?? "");
    setHighestNote(kalaam.highestNote ?? "");
    setLowestNote(kalaam.lowestNote ?? "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/kalaams/${kalaam.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category,
          recitedBy: recitedBy.trim() || undefined,
          pdfLink: pdfLink.trim() || undefined,
          highestNote: highestNote.trim() || undefined,
          lowestNote: lowestNote.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update kalaam");
      }
      toast.success("Kalaam updated");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error updating kalaam");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Edit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Kalaam</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Aaj Ashura Hai"
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="w-full min-w-[200px]">
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Recited By</Label>
            <Input
              value={recitedBy}
              onChange={(e) => setRecitedBy(e.target.value)}
              placeholder="e.g. Maulana Syed Ali"
            />
          </div>
          <div className="space-y-2">
            <Label>PDF Link</Label>
            <Input
              value={pdfLink}
              onChange={(e) => setPdfLink(e.target.value)}
              placeholder="https://…"
              type="url"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Highest Note</Label>
              <Input
                value={highestNote}
                onChange={(e) => setHighestNote(e.target.value)}
                placeholder="e.g. D5"
              />
            </div>
            <div className="space-y-2">
              <Label>Lowest Note</Label>
              <Input
                value={lowestNote}
                onChange={(e) => setLowestNote(e.target.value)}
                placeholder="e.g. B2"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { setOpen(false); reset(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
