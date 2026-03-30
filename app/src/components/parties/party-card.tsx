"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface PartyCardProps {
  party: {
    id: string;
    name: string;
    description?: string | null;
    coordinator?: { id: string; displayName: string } | null;
    _count?: { members: number };
  };
}

export function PartyCard({ party }: PartyCardProps) {
  return (
    <Link href={`/admin/parties/${party.id}`}>
      <div className="bg-card border border-border rounded-lg px-5 py-4 hover:bg-accent/40 transition-colors cursor-pointer">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground truncate">{party.name}</h3>
            {party.description && (
              <p className="text-muted-foreground text-sm mt-0.5 line-clamp-1">{party.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {party.coordinator ? (
                <Badge variant="outline" className="text-xs border-primary text-primary">
                  PC: {party.coordinator.displayName}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  No coordinator
                </Badge>
              )}
              {party._count != null && (
                <Badge variant="secondary" className="text-xs">
                  {party._count.members} member{party._count.members !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
