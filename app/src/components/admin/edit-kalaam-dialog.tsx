"use client";

import { useState, useRef } from "react";
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
  pdfFileKey?: string | null;
  pdfFileName?: string | null;
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
  const [pdfFileKey, setPdfFileKey] = useState<string | null>(kalaam.pdfFileKey ?? null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(kalaam.pdfFileName ?? null);
  const [highestNote, setHighestNote] = useState(kalaam.highestNote ?? "");
  const [lowestNote, setLowestNote] = useState(kalaam.lowestNote ?? "");
  const [pdfUploading, setPdfUploading] = useState(false);
  const pdfRef = useRef<HTMLInputElement>(null);

  function reset() {
    setTitle(kalaam.title);
    setCategory(kalaam.category);
    setRecitedBy(kalaam.recitedBy ?? "");
    setPdfLink(kalaam.pdfLink ?? "");
    setPdfFileKey(kalaam.pdfFileKey ?? null);
    setPdfFileName(kalaam.pdfFileName ?? null);
    setHighestNote(kalaam.highestNote ?? "");
    setLowestNote(kalaam.lowestNote ?? "");
  }

  async function handlePdfSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setPdfUploading(true);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: "application/pdf",
          contentLength: file.size,
          context: "kalaamPdf",
          kalaamId: kalaam.id,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to get upload URL");
      }
      const { uploadUrl, fileKey } = await res.json();

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Failed to upload PDF");

      setPdfFileKey(fileKey);
      setPdfFileName(file.name);
      toast.success("PDF uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "PDF upload failed");
    } finally {
      setPdfUploading(false);
    }
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
          pdfFileKey: pdfFileKey ?? null,
          pdfFileName: pdfFileName ?? null,
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
            <Label>PDF Link (URL)</Label>
            <Input
              value={pdfLink}
              onChange={(e) => setPdfLink(e.target.value)}
              placeholder="https://…"
              type="url"
            />
          </div>
          <div className="space-y-2">
            <Label>PDF File Upload</Label>
            {pdfFileKey ? (
              <div className="flex items-center gap-2">
                <span className="text-primary text-sm truncate">{pdfFileName ?? "PDF uploaded"}</span>
                <button
                  type="button"
                  onClick={() => { setPdfFileKey(null); setPdfFileName(null); }}
                  className="text-destructive text-xs hover:text-destructive/80"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => pdfRef.current?.click()}
                  disabled={pdfUploading}
                >
                  {pdfUploading ? "Uploading…" : "Upload PDF"}
                </Button>
                <span className="text-muted-foreground text-xs">PDF only · max 20 MB</span>
                <Input
                  ref={pdfRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handlePdfSelect}
                />
              </div>
            )}
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
