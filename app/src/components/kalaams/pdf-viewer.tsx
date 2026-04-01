"use client";

import { useState } from "react";
import { toast } from "sonner";

interface Props {
  fileKey?: string | null;
  fileName?: string | null;
  pdfLink?: string | null;
}

export function PdfViewer({ fileKey, fileName, pdfLink }: Props) {
  const [open, setOpen] = useState(false);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!fileKey && !pdfLink) return null;

  async function handleOpen() {
    if (iframeSrc) {
      setOpen(true);
      return;
    }

    if (pdfLink && !fileKey) {
      setIframeSrc(pdfLink);
      setOpen(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/pdf/${fileKey}`);
      if (!res.ok) throw new Error("Failed to get PDF URL");
      const { url } = await res.json();
      setIframeSrc(url);
      setOpen(true);
    } catch {
      toast.error("Failed to load PDF");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={loading}
        className="text-sm text-primary hover:underline disabled:opacity-50"
      >
        {loading ? "Loading…" : "📄 View PDF"}
      </button>

      {open && iframeSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            className="bg-background rounded-xl overflow-hidden flex flex-col shadow-2xl"
            style={{ width: "90vw", height: "90vh" }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <span className="text-sm font-medium text-foreground truncate">
                {fileName ?? "Kalaam PDF"}
              </span>
              <div className="flex items-center gap-4 shrink-0">
                <a
                  href={iframeSrc}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Open in new tab ↗
                </a>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-sm font-semibold text-foreground bg-secondary hover:bg-accent px-3 py-1 rounded-md transition-colors"
                >
                  ✕ Close
                </button>
              </div>
            </div>
            <iframe
              src={iframeSrc}
              className="flex-1 w-full"
              title={fileName ?? "Kalaam PDF"}
            />
          </div>
        </div>
      )}
    </>
  );
}

