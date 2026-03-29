"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface User {
  id: string;
  username: string;
  displayName: string;
  role: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/reciters")
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.filter((u: User) => u.role !== "GOD"));
        setLoading(false);
      });
  }, []);

  async function changeRole(userId: string, role: "ADMIN" | "PARTY_MEMBER") {
    setUpdating(userId);
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Failed to update role");
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
      toast.success("Role updated");
    } catch {
      toast.error("Failed to update role");
    } finally {
      setUpdating(null);
    }
  }

  if (loading) return <p className="text-muted-foreground p-4">Loading…</p>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Promote or demote Admin access
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="divide-y divide-border">
          {users.map((u) => (
            <div key={u.id} className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-foreground font-medium">{u.displayName}</p>
                <p className="text-muted-foreground text-sm">@{u.username}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xs">
                  {u.role === "ADMIN" ? "Admin" : "Member"}
                </Badge>
                <Select
                  value={u.role}
                  onValueChange={(v) => changeRole(u.id, v as "ADMIN" | "PARTY_MEMBER")}
                  disabled={updating === u.id}
                >
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="PARTY_MEMBER">Party Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
