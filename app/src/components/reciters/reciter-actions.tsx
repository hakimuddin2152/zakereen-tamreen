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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  reciterId: string;
  isActive: boolean;
  displayName: string;
  currentGrade?: string;
}

export function ReciterActions({ reciterId, isActive, displayName, currentGrade }: Props) {
  const router = useRouter();
  const [resetOpen, setResetOpen] = useState(false);
  const [gradeOpen, setGradeOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [settingGrade, setSettingGrade] = useState(false);
  const [pendingGrade, setPendingGrade] = useState<string>(currentGrade ?? "");

  async function handleSetGrade() {
    setSettingGrade(true);
    try {
      const res = await fetch(`/api/reciters/${reciterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade: pendingGrade === "none" ? null : pendingGrade || null }),
      });
      if (!res.ok) throw new Error("Failed to set grade");
      toast.success(`Grade ${pendingGrade === "none" ? "cleared" : pendingGrade} for ${displayName}`);
      setGradeOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to set grade");
    } finally {
      setSettingGrade(false);
    }
  }

  async function toggleActive() {
    setToggling(true);
    try {
      const res = await fetch(`/api/reciters/${reciterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(isActive ? `${displayName} deactivated` : `${displayName} reactivated`);
      router.refresh();
    } catch {
      toast.error("Failed to update account");
    } finally {
      setToggling(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (data.get("password") !== data.get("confirm")) {
      toast.error("Passwords do not match");
      return;
    }
    setResetting(true);
    try {
      const res = await fetch(`/api/reciters/${reciterId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: data.get("password") }),
      });
      if (!res.ok) throw new Error("Failed to reset");
      toast.success("Password reset");
      setResetOpen(false);
    } catch {
      toast.error("Failed to reset password");
    } finally {
      setResetting(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
          >
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => { setPendingGrade(currentGrade ?? ""); setGradeOpen(true); }}
          >
            Set Grade
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => setResetOpen(true)}
          >
            Reset Password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className={toggling ? "opacity-50" : isActive ? "text-destructive cursor-pointer" : "text-primary cursor-pointer"}
            onClick={toggleActive}
            disabled={toggling}
          >
            {isActive ? "Deactivate" : "Reactivate"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={gradeOpen} onOpenChange={setGradeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Grade — {displayName}</DialogTitle>
            <DialogDescription>
              Assign a performance grade to this member.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <Label>Grade</Label>
            <Select value={pendingGrade} onValueChange={setPendingGrade}>
              <SelectTrigger>
                <SelectValue placeholder="No grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No grade</SelectItem>
                <SelectItem value="A">A — Excellent</SelectItem>
                <SelectItem value="B">B — Good</SelectItem>
                <SelectItem value="C">C — Average</SelectItem>
                <SelectItem value="D">D — Needs work</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGradeOpen(false)}>Cancel</Button>
            <Button onClick={handleSetGrade} disabled={settingGrade}>
              {settingGrade ? "Saving…" : "Save Grade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password — {displayName}</DialogTitle>
            <DialogDescription>
              Set a new password for this reciter.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>New Password *</Label>
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
                name="confirm"
                type="password"
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={resetting}
              >
                {resetting ? "Resetting…" : "Reset Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
