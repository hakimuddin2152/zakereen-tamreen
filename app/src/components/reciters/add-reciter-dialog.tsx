"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

export function AddReciterDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const body = {
      username: data.get("username"),
      displayName: data.get("displayName"),
      password: data.get("password"),
      partyName: data.get("partyName") || undefined,
    };

    if (data.get("password") !== data.get("confirmPassword")) {
      toast.error("Passwords do not match");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/reciters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = typeof json.error === "string" ? json.error : "Failed to create reciter";
        throw new Error(msg);
      }
      toast.success(`${json.displayName} added`);
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Add Member</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Party Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Display Name *</Label>
            <Input
              name="displayName"
              required
              placeholder="Ali Hussain"
            />
          </div>
          <div className="space-y-2">
            <Label>Username *</Label>
            <Input
              name="username"
              required
              placeholder="ali_hussain"
            />
            <p className="text-muted-foreground text-xs">Lowercase letters, numbers, underscores only</p>
          </div>
          <div className="space-y-2">
            <Label>Party / Group Name</Label>
            <Input
              name="partyName"
              placeholder="Anjuman Hussainia"
            />
          </div>
          <div className="space-y-2">
            <Label>Password *</Label>
            <Input
              name="password"
              type="password"
              required
              placeholder="Min 8 characters"
            />
          </div>
          <div className="space-y-2">
            <Label>Confirm Password *</Label>
            <Input
              name="confirmPassword"
              type="password"
              required
              placeholder="Repeat password"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
            >
              {saving ? "Adding…" : "Add Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
