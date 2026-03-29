"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

interface Reciter { id: string; displayName: string }
interface Kalaam { id: string; title: string }

interface Props {
  reciters: Reciter[];
  kalaams: Kalaam[];
}

export function NewSessionForm({ reciters, kalaams }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedAttendees, setSelectedAttendees] = useState<Set<string>>(new Set());
  const [kalaamMode, setKalaamMode] = useState<"existing" | "new">("existing");
  const [selectedKalaamId, setSelectedKalaamId] = useState<string>("");
  const [newKalaamTitle, setNewKalaamTitle] = useState("");

  function toggleAttendee(id: string) {
    setSelectedAttendees((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (selectedAttendees.size === 0) {
      toast.error("Select at least one attendee");
      return;
    }
    if (kalaamMode === "existing" && !selectedKalaamId) {
      toast.error("Select a kalaam or add a new one");
      return;
    }
    if (kalaamMode === "new" && !newKalaamTitle.trim()) {
      toast.error("Enter a kalaam title");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const body = {
      date: new Date(formData.get("date") as string).toISOString(),
      kalaamId: kalaamMode === "existing" ? selectedKalaamId || undefined : undefined,
      kalaamTitle: kalaamMode === "new" ? newKalaamTitle : undefined,
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
        throw new Error(err.error || "Failed to create session");
      }
      const session = await res.json();
      toast.success("Session created");
      router.push(`/sessions/${session.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error creating session");
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
            <Label>Kalaam / Marasiya *</Label>
            <div className="flex gap-2 mb-2">
              <Button
                type="button"
                size="sm"
                variant={kalaamMode === "existing" ? "default" : "outline"}
                onClick={() => setKalaamMode("existing")}
              >
                Select Existing
              </Button>
              <Button
                type="button"
                size="sm"
                variant={kalaamMode === "new" ? "default" : "outline"}
                onClick={() => setKalaamMode("new")}
              >
                Add New
              </Button>
            </div>
            {kalaamMode === "existing" ? (
              <Select value={selectedKalaamId} onValueChange={setSelectedKalaamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a kalaam…" />
                </SelectTrigger>
                <SelectContent>
                  {kalaams.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={newKalaamTitle}
                onChange={(e) => setNewKalaamTitle(e.target.value)}
                placeholder="Enter kalaam title…"
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
          {reciters.length === 0 ? (
            <p className="text-muted-foreground text-sm">No reciters added yet. Add reciters in Admin → Reciters.</p>
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
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
