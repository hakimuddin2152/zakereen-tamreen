"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function NewMajlisForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const date = fd.get("date") as string;
    const occasion = (fd.get("occasion") as string).trim() || undefined;
    const notes = (fd.get("notes") as string).trim() || undefined;

    setLoading(true);
    try {
      const res = await fetch("/api/majlis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: new Date(date).toISOString(), occasion, notes }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to create Majlis");
        return;
      }
      const majlis = await res.json();
      toast.success("Majlis created");
      router.push(`/majlis/${majlis.id}`);
      router.refresh();
    } catch {
      toast.error("Error creating Majlis");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="date">Date *</Label>
        <Input
          id="date"
          name="date"
          type="date"
          required
          defaultValue={new Date().toISOString().split("T")[0]}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="occasion">Occasion</Label>
        <Input
          id="occasion"
          name="occasion"
          placeholder="e.g. Chehlum 1446 AH"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} placeholder="Optional notes…" />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create Majlis"}
        </Button>
      </div>
    </form>
  );
}
