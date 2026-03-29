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

export function AddKalaamDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("MISC");
  const [recitedBy, setRecitedBy] = useState("");
  const [pdfLink, setPdfLink] = useState("");
  const [highestNote, setHighestNote] = useState("");
  const [lowestNote, setLowestNote] = useState("");

  function reset() {
    setTitle("");
    setCategory("MISC");
    setRecitedBy("");
    setPdfLink("");
    setHighestNote("");
    setLowestNote("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/kalaam", {
        method: "POST",
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
        throw new Error(err.error || "Failed to add kalaam");
      }
      toast.success("Kalaam added");
      reset();
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error adding kalaam");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button>+ Add Kalaam</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Kalaam</DialogTitle>
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
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
              {loading ? "Adding…" : "Add Kalaam"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
