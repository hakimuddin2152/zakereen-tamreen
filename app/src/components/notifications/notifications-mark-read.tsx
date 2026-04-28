"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function NotificationsMarkRead() {
  const router = useRouter();

  async function handleMarkAll() {
    await fetch("/api/notifications", { method: "PATCH" });
    router.refresh();
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleMarkAll} className="text-muted-foreground text-xs">
      Mark all read
    </Button>
  );
}
