"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AudioPlayer } from "@/components/evaluations/audio-player";

interface FeedbackAuthor {
  id: string;
  displayName: string;
  role: string;
}

interface Feedback {
  id: string;
  authorId: string;
  comment: string | null;
  ranking: number | null;
  audioFileKey: string | null;
  audioFileName: string | null;
  createdAt: string | Date;
  author: FeedbackAuthor;
}

interface Props {
  kalaamId: string;
  recordingId: string;
  isCoordinator: boolean;
  initialFeedbacks: Feedback[];
}

function StarRating({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(value === s ? null : s)}
          className={`text-base leading-none transition-colors ${
            value !== null && s <= value
              ? "text-yellow-400"
              : "text-muted-foreground/30 hover:text-yellow-400/60"
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RecordingFeedbackPanel({
  kalaamId,
  recordingId,
  isCoordinator,
  initialFeedbacks,
}: Props) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(initialFeedbacks);
  const [showCompose, setShowCompose] = useState(false);
  const [comment, setComment] = useState("");
  const [ranking, setRanking] = useState<number | null>(null);
  const [audioFileKey, setAudioFileKey] = useState<string | null>(null);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function formatTime(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  async function uploadAudioFile(file: File) {
    setUploading(true);
    setUploadProgress(0);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: file.type || "audio/mpeg",
          contentLength: file.size,
          context: "recordingFeedback",
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

      setAudioFileKey(fileKey);
      setAudioFileName(file.name);
      toast.success("Audio attached");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
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
        const file = new File([blob], `feedback-${Date.now()}.webm`, { type: "audio/webm" });
        await uploadAudioFile(file);
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

  function resetCompose() {
    setComment("");
    setRanking(null);
    setAudioFileKey(null);
    setAudioFileName(null);
    setShowCompose(false);
  }

  async function handleSubmit() {
    if (!comment.trim() && !audioFileKey) {
      toast.error("Add a comment or attach an audio clip");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/kalaams/${kalaamId}/recordings/${recordingId}/feedback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            comment: comment.trim() || null,
            ranking,
            audioFileKey,
            audioFileName,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to submit feedback");
        return;
      }
      const saved: Feedback = await res.json();
      setFeedbacks((prev) => [...prev, saved]);
      resetCompose();
      toast.success("Feedback sent");
    } catch {
      toast.error("Error submitting feedback");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(feedbackId: string) {
    try {
      const res = await fetch(
        `/api/kalaams/${kalaamId}/recordings/${recordingId}/feedback?feedbackId=${feedbackId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed");
      setFeedbacks((prev) => prev.filter((f) => f.id !== feedbackId));
      toast.success("Deleted");
    } catch {
      toast.error("Could not delete feedback");
    }
  }

  if (feedbacks.length === 0 && !isCoordinator) return null;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Feedback {feedbacks.length > 0 && `(${feedbacks.length})`}
      </p>

      {/* Thread */}
      {feedbacks.length > 0 && (
        <div className="space-y-2">
          {feedbacks.map((f) => (
            <div
              key={f.id}
              className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground">{f.author.displayName}</span>
                  {f.ranking !== null && (
                    <span className="text-yellow-400 text-xs">
                      {"★".repeat(f.ranking)}
                      <span className="text-muted-foreground/30">{"★".repeat(5 - f.ranking)}</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{formatDate(f.createdAt)}</span>
                  {isCoordinator && (
                    <button
                      type="button"
                      onClick={() => handleDelete(f.id)}
                      className="text-destructive/60 hover:text-destructive text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {f.comment && (
                <p className="text-foreground/80 whitespace-pre-wrap leading-relaxed">{f.comment}</p>
              )}

              {f.audioFileKey && (
                <div className="pt-0.5">
                  <AudioPlayer
                    fileKey={f.audioFileKey}
                    fileName={f.audioFileName ?? undefined}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Compose — coordinator only */}
      {isCoordinator && (
        <>
          {!showCompose ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-2 text-muted-foreground"
              onClick={() => setShowCompose(true)}
            >
              + Add feedback
            </Button>
          ) : (
            <div className="rounded-md border border-border p-3 space-y-3 bg-muted/10">
              <StarRating value={ranking} onChange={setRanking} />

              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Your feedback… (optional if audio provided)"
                rows={2}
                className="resize-none text-xs"
              />

              {/* Audio attachment */}
              <div className="space-y-1">
                {audioFileKey ? (
                  <div className="flex items-center gap-2">
                    <AudioPlayer fileKey={audioFileKey} fileName={audioFileName ?? undefined} />
                    <button
                      type="button"
                      onClick={() => { setAudioFileKey(null); setAudioFileName(null); }}
                      className="text-destructive/60 hover:text-destructive text-xs shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ) : isRecording ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-destructive font-medium animate-pulse">
                      ● {formatTime(recordingTime)}
                    </span>
                    <Button type="button" variant="destructive" size="sm" onClick={stopRecording}>
                      Stop
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={startRecording}
                      disabled={uploading}
                    >
                      🎙 Record
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? `${uploadProgress}%…` : "Attach audio"}
                    </Button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) { e.target.value = ""; uploadAudioFile(f); }
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={submitting || uploading || isRecording}
                >
                  {submitting ? "Sending…" : "Send"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={resetCompose}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

