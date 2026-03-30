"use client";

import { useState } from "react";
import { toast } from "sonner";

interface Props {
  fileKey?: string | null;
  fileName?: string | null;
  pdfLink?: string | null;
}

export function PdfViewer({ fileKey, fileName, pdfLink }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!fileKey && !pdfLink) return null;

  async function handleToggle() {
    if (expanded) {
      setExpanded(false);
      return;
    }

    if (iframeSrc) {
      // Already loaded — just re-expand
      setExpanded(true);
      return;
    }

    if (pdfLink && !fileKey) {
      // External link — load directly
      setIframeSrc(pdfLink);
      setExpanded(true);
      return;
    }

    // S3 fileKey — fetch presigned URL
    setLoading(true);
    try {
      const res = await fetch(`/api/pdf/${fileKey}`);
      if (!res.ok) throw new Error("Failed to get PDF URL");
      const { url } = await res.json();
      setIframeSrc(url);
      setExpanded(true);
    } catch {
      toast.error("Failed to load PDF");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleToggle}
          disabled={loading}
          className="text-sm text-primary hover:underline disabled:opacity-50"
        >
          {loading ? "Loading…" : expanded ? "📄 Hide PDF" : "📄 View PDF"}
        </button>
        {expanded && iframeSrc && (
          <a
            href={iframeSrc}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Open in new tab ↗
          </a>
        )}
      </div>

      {expanded && iframeSrc && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="bg-muted/50 px-4 py-2 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              {fileName ?? "Kalaam PDF"}
            </span>
          </div>
          <iframe
            src={iframeSrc}
            className="w-full"
            style={{ height: "75vh" }}
            title={fileName ?? "Kalaam PDF"}
          />
        </div>
      )}
    </div>
  );
}
