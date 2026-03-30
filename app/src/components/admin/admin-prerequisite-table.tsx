"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Member {
  id: string;
  displayName: string;
  party?: { name: string } | null;
}

interface Prereq {
  userId: string;
  lehenDone: boolean;
  hifzDone: boolean;
}

interface Props {
  kalaamId: string;
  members: Member[];
  initialPrereqs: Prereq[];
}

function Toggle({
  label,
  done,
  loading,
  onToggle,
}: {
  label: string;
  done: boolean;
  loading: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={loading}
      className={`text-xs px-2 py-1 rounded font-medium border transition-colors disabled:opacity-50 ${
        done
          ? "bg-green-600/20 text-green-400 border-green-600/30 hover:bg-green-600/30"
          : "bg-muted text-muted-foreground border-border hover:bg-accent hover:text-foreground"
      }`}
    >
      {done ? "✓" : "✗"} {label}
    </button>
  );
}

export function AdminPrerequisiteTable({ kalaamId, members, initialPrereqs }: Props) {
  const router = useRouter();
  const [prereqs, setPrereqs] = useState<Map<string, Prereq>>(
    new Map(initialPrereqs.map((p) => [p.userId, p]))
  );
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  async function toggle(userId: string, field: "lehenDone" | "hifzDone") {
    const current = prereqs.get(userId) ?? { userId, lehenDone: false, hifzDone: false };
    const newValue = !current[field];
    const key = `${userId}-${field}`;
    setLoadingKey(key);

    try {
      const res = await fetch(`/api/prerequisites?userId=${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kalaamId, [field]: newValue }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setPrereqs((prev) => {
        const next = new Map(prev);
        next.set(userId, { ...current, [field]: newValue });
        return next;
      });
      toast.success("Updated");
      router.refresh();
    } catch {
      toast.error("Could not update prerequisite");
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <div className="divide-y divide-border">
      {members.map((m) => {
        const p = prereqs.get(m.id) ?? { userId: m.id, lehenDone: false, hifzDone: false };
        return (
          <div key={m.id} className="px-5 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-foreground text-sm font-medium">{m.displayName}</p>
              {m.party?.name && (
                <p className="text-muted-foreground text-xs">{m.party.name}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Toggle
                label="Grasped Lehen"
                done={p.lehenDone}
                loading={loadingKey === `${m.id}-lehenDone`}
                onToggle={() => toggle(m.id, "lehenDone")}
              />
              <Toggle
                label="Read Twice"
                done={p.hifzDone}
                loading={loadingKey === `${m.id}-hifzDone`}
                onToggle={() => toggle(m.id, "hifzDone")}
              />
            </div>
          </div>
        );
      })}
      {members.length === 0 && (
        <p className="px-5 py-6 text-center text-muted-foreground text-sm">No active members.</p>
      )}
    </div>
  );
}
