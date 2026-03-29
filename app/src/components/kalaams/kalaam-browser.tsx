"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface Kalaam {
  id: string;
  title: string;
  category: string;
  recitedBy?: string | null;
  audioFileKey?: string | null;
  pdfLink?: string | null;
  _count?: { sessionKalaams: number };
}

interface Props {
  kalaams: Kalaam[];
  isPrivileged?: boolean;
  /** If provided, kalaams become selectable (checkbox mode) */
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggle?: (id: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  MARASIYA: "Marasiya",
  SALAAM: "Salaam",
  MADEH: "Madeh",
  MISC: "Misc",
};

const CATEGORY_ORDER = ["MARASIYA", "SALAAM", "MADEH", "MISC"] as const;

export function KalaamBrowser({
  kalaams,
  selectable = false,
  selectedIds,
  onToggle,
}: Props) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggleCollapse(cat: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return kalaams;
    return kalaams.filter(
      (k) =>
        k.title.toLowerCase().includes(q) ||
        (k.recitedBy?.toLowerCase().includes(q) ?? false)
    );
  }, [kalaams, search]);

  const byCategory = useMemo(
    () =>
      Object.fromEntries(
        CATEGORY_ORDER.map((cat) => [
          cat,
          filtered.filter((k) => k.category === cat),
        ])
      ),
    [filtered]
  );

  const hasResults = filtered.length > 0;
  // When searching, auto-expand all categories that have results
  const isSearching = search.trim().length > 0;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="6" strokeWidth={2} />
          <line x1="16.5" y1="16.5" x2="21" y2="21" strokeWidth={2} strokeLinecap="round" />
        </svg>
        <Input
          placeholder="Search kalaams…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`pl-9 bg-background ${search ? "pr-8" : ""}`}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-xs"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Category groups */}
      <div className="space-y-4">
        {CATEGORY_ORDER.map((cat) => {
          const list = byCategory[cat];
          if (!list || list.length === 0) return null;
          const isCollapsed = !isSearching && collapsed.has(cat);

          return (
            <section key={cat}>
              {/* Category header – clickable to collapse */}
              <button
                type="button"
                onClick={() => toggleCollapse(cat)}
                className="w-full flex items-center justify-between gap-2 mb-2 group"
              >
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    {CATEGORY_LABELS[cat]}
                  </h2>
                  <Badge variant="secondary" className="text-xs font-normal">
                    {list.length}
                  </Badge>
                </div>
                <span className="text-muted-foreground text-xs group-hover:text-foreground transition-colors">
                  {isCollapsed ? "▶" : "▼"}
                </span>
              </button>

              {!isCollapsed && (
                <div className="bg-card border border-border rounded-lg divide-y divide-border overflow-hidden">
                  {list.map((k) => {
                    if (selectable && onToggle && selectedIds) {
                      const checked = selectedIds.has(k.id);
                      return (
                        <button
                          key={k.id}
                          type="button"
                          onClick={() => onToggle(k.id)}
                          className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors ${
                            checked
                              ? "bg-primary/15 text-primary"
                              : "text-foreground hover:bg-accent/50"
                          }`}
                        >
                          <div>
                            <p className="font-medium text-sm">{k.title}</p>
                            {k.recitedBy && (
                              <p className="text-xs text-muted-foreground">
                                by {k.recitedBy}
                              </p>
                            )}
                          </div>
                          {checked && (
                            <span className="text-primary text-sm font-bold shrink-0">✓</span>
                          )}
                        </button>
                      );
                    }

                    return (
                      <Link key={k.id} href={`/kalaams/${k.id}`}>
                        <div className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-accent/50 transition-colors cursor-pointer">
                          <div>
                            <p className="text-foreground font-medium">{k.title}</p>
                            {k.recitedBy && (
                              <p className="text-muted-foreground text-xs">
                                by {k.recitedBy}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {k._count && k._count.sessionKalaams > 0 && (
                              <span className="text-muted-foreground text-xs">
                                {k._count.sessionKalaams} session
                                {k._count.sessionKalaams !== 1 ? "s" : ""}
                              </span>
                            )}
                            {k.audioFileKey && (
                              <Badge variant="outline" className="text-xs">
                                Audio
                              </Badge>
                            )}
                            {k.pdfLink && (
                              <Badge variant="outline" className="text-xs">
                                PDF
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}

        {!hasResults && (
          <p className="text-muted-foreground text-sm text-center py-6">
            No kalaams match &ldquo;{search}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}
