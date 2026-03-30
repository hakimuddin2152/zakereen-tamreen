"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AudioPlayer } from "@/components/evaluations/audio-player";

interface Recording {
  id: string;
  fileKey: string;
  fileName: string;
  createdAt: string | Date;
}

interface Props {
  kalaamId: string;
  initialRecordings: Recording[];
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export function KalaamRecordings({ kalaamId, initialRecordings }: Props) {
  const [recordings, setRecordings] = useState<Recording[]>(initialRecordings);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // allow re-selecting same file

    setUploading(true);
    setUploadProgress(0);

    try {
      // 1. Get presigned upload URL
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: file.type || "audio/mpeg",
          contentLength: file.size,
          context: "kalaamRecording",
          kalaamId,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to get upload URL");
      }
      const { uploadUrl, fileKey } = await res.json();

      // 2. Upload to S3
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

      // 3. Save recording to DB
      const saveRes = await fetch(`/api/kalaams/${kalaamId}/recordings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey, fileName: file.name }),
      });
      if (!saveRes.ok) throw new Error("Failed to save recording");
      const saved: Recording = await saveRes.json();

      // Keep only last 3 in UI (server already trims DB)
      setRecordings((prev) => [saved, ...prev].slice(0, 3));
      toast.success("Recording uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(recordingId: string) {
    try {
      const res = await fetch(
        `/api/kalaams/${kalaamId}/recordings?recordingId=${recordingId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete");
      setRecordings((prev) => prev.filter((r) => r.id !== recordingId));
      toast.success("Recording removed");
    } catch {
      toast.error("Failed to remove recording");
    }
  }

  return (
    <div>
      <div className="px-5 py-4 space-y-3">
        {recordings.length === 0 ? (
          <p className="text-muted-foreground text-sm">No recordings yet. Upload your practice audio below.</p>
        ) : (
          recordings.map((r, i) => (
            <div key={r.id} className="rounded-md border border-border bg-secondary/30 px-3 py-2 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  #{recordings.length - i} · {formatDate(r.createdAt)}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  className="text-destructive text-xs hover:text-destructive/80"
                >
                  Remove
                </button>
              </div>
              <AudioPlayer fileKey={r.fileKey} fileName={r.fileName} />
            </div>
          ))
        )}
      </div>

      <div className="px-5 pb-4 flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? `Uploading ${uploadProgress}%…` : "Upload Recording"}
        </Button>
        <span className="text-muted-foreground text-xs">
          mp3, wav, m4a · max 50 MB · last 3 kept
        </span>
        <Input
          ref={fileRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    </div>
  );
}
