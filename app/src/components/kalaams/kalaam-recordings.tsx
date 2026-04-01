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

function formatTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

export function KalaamRecordings({ kalaamId, initialRecordings }: Props) {
  const [recordings, setRecordings] = useState<Recording[]>(initialRecordings);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function uploadFile(file: File) {
    setUploading(true);
    setUploadProgress(0);
    try {
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

      const saveRes = await fetch(`/api/kalaams/${kalaamId}/recordings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey, fileName: file.name }),
      });
      if (!saveRes.ok) throw new Error("Failed to save recording");
      const saved: Recording = await saveRes.json();
      setRecordings((prev) => [saved, ...prev].slice(0, 3));
      toast.success("Recording saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    await uploadFile(file);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `live-recording-${Date.now()}.webm`, { type: "audio/webm" });
        await uploadFile(file);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      toast.error("Microphone access denied");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
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
          <p className="text-muted-foreground text-sm">No recordings yet. Record live or upload a file below.</p>
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

      <div className="px-5 pb-4 flex items-center gap-3 flex-wrap">
        {isRecording ? (
          <>
            <span className="text-sm text-destructive font-medium animate-pulse">
              ● {formatTime(recordingTime)}
            </span>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={stopRecording}
            >
              Stop Recording
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={startRecording}
              disabled={uploading}
            >
              🎙 Record Live
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? `Uploading ${uploadProgress}%…` : "Upload File"}
            </Button>
            <span className="text-muted-foreground text-xs">
              mp3, wav, m4a · max 50 MB · last 3 kept
            </span>
          </>
        )}
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
