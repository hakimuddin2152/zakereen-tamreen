"use client";

import { useState } from "react";

interface Props {
  fileKey: string;
  fileName?: string;
}

export function AudioPlayer({ fileKey, fileName }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadAndPlay() {
    if (url) return; // already loaded
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/audio/${encodeURIComponent(fileKey)}`);
      if (!res.ok) throw new Error("Failed to get playback URL");
      const { url: signedUrl } = await res.json();
      setUrl(signedUrl);
    } catch {
      setError("Could not load audio");
    } finally {
      setLoading(false);
    }
  }

  if (error) {
    return <span className="text-red-400 text-xs">{error}</span>;
  }

  if (!url) {
    return (
      <button
        type="button"
        onClick={loadAndPlay}
        disabled={loading}
        className="text-xs text-primary hover:text-primary/80 underline underline-offset-2"
      >
        {loading ? "Loading…" : `▶ Play${fileName ? ` — ${fileName}` : ""}`}
      </button>
    );
  }

  return (
    <div className="mt-1">
      {fileName && <p className="text-muted-foreground text-xs mb-1">{fileName}</p>}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio controls src={url} className="w-full sm:max-w-xs" />
    </div>
  );
}
