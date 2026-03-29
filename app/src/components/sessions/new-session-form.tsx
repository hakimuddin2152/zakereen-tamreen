"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { KalaamBrowser } from "@/components/kalaams/kalaam-browser";

interface Reciter { id: string; displayName: string; role?: string }
interface Kalaam { id: string; title: string; category: string; recitedBy?: string | null }

interface Props {
  reciters: Reciter[];
  kalaams: Kalaam[];
}

export function NewSessionForm({ reciters, kalaams }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedAttendees, setSelectedAttendees] = useState<Set<string>>(new Set());
  const [selectedKalaams, setSelectedKalaams] = useState<Set<string>>(new Set());

  function toggleAttendee(id: string) {
    setSelectedAttendees((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleKalaam(id: string) {
    setSelectedKalaams((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (selectedAttendees.size === 0) {
      toast.error("Select at least one attendee");
      return;
    }
    if (selectedKalaams.size === 0) {
      toast.error("Select at least one kalaam");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const body = {
      date: new Date(formData.get("date") as string).toISOString(),
      kalaamIds: Array.from(selectedKalaams),
      notes: (formData.get("notes") as string) || undefined,
      attendeeIds: Array.from(selectedAttendees),
    };

    setLoading(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        // Surface prerequisite errors clearly
        if (err.details && Array.isArray(err.details)) {
          err.details.forEach((d: string) => toast.error(d));
        } else {
          toast.error(err.error || "Failed to create session");
        }
        return;
      }
      const session = await res.json();
      toast.success("Session created");
      router.push(`/sessions/${session.id}`);
    } catch {
      toast.error("Error creating session");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="space-y-2">
            <Label>Date *</Label>
            <Input
              name="date"
              type="date"
              required
              defaultValue={new Date().toISOString().split("T")[0]}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Kalaams * ({selectedKalaams.size} selected)
            </Label>
            {kalaams.length === 0 ? (
              <p className="text-muted-foreground text-sm">No kalaams in library yet.</p>
            ) : (
              <KalaamBrowser
                kalaams={kalaams}
                selectable
                selectedIds={selectedKalaams}
                onToggle={toggleKalaam}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>Session Notes</Label>
            <Textarea
              name="notes"
              placeholder="General session notes…"
              rows={3}
              className="resize-none"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <Label className="mb-3 block">
            Attendance * ({selectedAttendees.size} selected)
          </Label>
          <p className="text-muted-foreground text-xs mb-3">
            Only members who have completed Lehen &amp; Hifz for all selected kalaams can be added.
          </p>
          {reciters.length === 0 ? (
            <p className="text-muted-foreground text-sm">No members added yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {reciters.map((r) => {
                const checked = selectedAttendees.has(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleAttendee(r.id)}
                    className={`text-left px-3 py-2 rounded-md text-sm border transition-colors ${
                      checked
                        ? "bg-primary/20 border-primary text-primary"
                        : "bg-secondary border-border text-muted-foreground hover:border-foreground/30"
                    }`}
                  >
                    {checked ? "✓ " : ""}{r.displayName}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create Session"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
