"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function AddKalaamForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("MARASIYA");
  const [recitedBy, setRecitedBy] = useState("");
  const [pdfLink, setPdfLink] = useState("");
  const [pdfFileKey, setPdfFileKey] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const pdfRef = useRef<HTMLInputElement>(null);
  const [audioFileKey, setAudioFileKey] = useState<string | null>(null);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);
  const [audioUploading, setAudioUploading] = useState(false);
  const audioRef = useRef<HTMLInputElement>(null);
  const [highestNote, setHighestNote] = useState("");
  const [lowestNote, setLowestNote] = useState("");

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

  async function handleAudioSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setAudioUploading(true);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: file.type || "audio/mpeg",
          contentLength: file.size,
          context: "kalaamAudio",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to get upload URL");
      }
      const { uploadUrl, fileKey } = await res.json();
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "audio/mpeg" },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Failed to upload audio");
      setAudioFileKey(fileKey);
      setAudioFileName(file.name);
      toast.success("Audio uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Audio upload failed");
    } finally {
      setAudioUploading(false);
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
      const res = await fetch("/api/kalaam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category,
          recitedBy: recitedBy.trim() || undefined,
          pdfLink: pdfLink.trim() || undefined,
          pdfFileKey: pdfFileKey ?? null,
          pdfFileName: pdfFileName ?? null,
          audioFileKey: audioFileKey ?? null,
          audioFileName: audioFileName ?? null,
          highestNote: highestNote.trim() || undefined,
          lowestNote: lowestNote.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add kalaam");
      }
      const data = await res.json();
      toast.success("Kalaam added");
      router.push(`/kalaams/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error adding kalaam");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
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
      <div className="space-y-2">
        <Label>Original Reciter Audio</Label>
        {audioFileKey ? (
          <div className="flex items-center gap-2">
            <span className="text-primary text-sm truncate">{audioFileName ?? "Audio uploaded"}</span>
            <button
              type="button"
              onClick={() => { setAudioFileKey(null); setAudioFileName(null); }}
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
              onClick={() => audioRef.current?.click()}
              disabled={audioUploading}
            >
              {audioUploading ? "Uploading…" : "Upload Audio"}
            </Button>
            <span className="text-muted-foreground text-xs">mp3, wav, m4a · max 50 MB</span>
            <Input
              ref={audioRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleAudioSelect}
            />
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
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
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Adding…" : "Add Kalaam"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
