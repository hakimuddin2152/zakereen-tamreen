"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const VOICE_RANGES = ["Bass", "Baritone", "Tenor", "Counter-Tenor", "Alto", "Other"];

interface Evaluation {
  id: string;
  userId: string;
  ranking: number | null;
  voiceRange: string | null;
  audioFileKey: string | null;
  audioFileName: string | null;
  notes: string | null;
}

interface Props {
  sessionId: string;
  userId: string;
  userName: string;
  existing: Evaluation | null;
  onSaved: (ev: Evaluation) => void;
  onClose: () => void;
}

function StarSelector({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`text-2xl transition-colors ${
            n <= value ? "text-yellow-400" : "text-muted-foreground hover:text-yellow-500"
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function EvaluationDialog({ sessionId, userId, userName, existing, onSaved, onClose }: Props) {
  const [ranking, setRanking] = useState<number>(existing?.ranking ?? 0);
  const [voiceRange, setVoiceRange] = useState<string>(existing?.voiceRange ?? "");
  const [notes, setNotes] = useState<string>(existing?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadedKey, setUploadedKey] = useState<string | null>(existing?.audioFileKey ?? null);
  const [uploadedName, setUploadedName] = useState<string | null>(existing?.audioFileName ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    await uploadFile(file);
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setUploadProgress(0);
    try {
      // 1. Get presigned URL
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: file.type || "audio/mpeg",
          contentLength: file.size,
          sessionId,
          userId,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to get upload URL");
      }
      const { uploadUrl, fileKey } = await res.json();

      // 2. Upload directly to storage
      const xhr = new XMLHttpRequest();
      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (ev) => {
          if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        });
        xhr.addEventListener("error", () => reject(new Error("Upload network error")));
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type || "audio/mpeg");
        xhr.send(file);
      });

      setUploadedKey(fileKey);
      setUploadedName(file.name);
      toast.success("Audio uploaded successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
      setPendingFile(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/evaluations/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ranking: ranking || null,
          voiceRange: voiceRange || null,
          notes: notes || null,
          audioFileKey: uploadedKey,
          audioFileName: uploadedName,
        }),
      });
      if (!res.ok) throw new Error("Failed to save evaluation");
      const saved = await res.json();
      toast.success("Evaluation saved");
      onSaved(saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Evaluate — {userName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Ranking</Label>
            <StarSelector value={ranking} onChange={setRanking} />
          </div>

          <div className="space-y-2">
            <Label>Voice Range</Label>
            <Select value={voiceRange} onValueChange={setVoiceRange}>
              <SelectTrigger>
                <SelectValue placeholder="Select voice range…" />
              </SelectTrigger>
              <SelectContent>
                {VOICE_RANGES.map((vr) => (
                  <SelectItem key={vr} value={vr}>{vr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Feedback notes…"
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>Voice Recording</Label>
            {uploadedKey ? (
              <div className="flex items-center gap-2">
                <span className="text-primary text-sm truncate">{uploadedName ?? "Audio file"}</span>
                <button
                  type="button"
                  onClick={() => { setUploadedKey(null); setUploadedName(null); setPendingFile(null); }}
                  className="text-destructive text-xs hover:text-destructive/80"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? `Uploading ${uploadProgress}%…` : "Upload Audio"}
                </Button>
                <Input
                  ref={fileRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <p className="text-muted-foreground text-xs mt-1">mp3, wav, m4a, ogg — max 50 MB</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || uploading}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
