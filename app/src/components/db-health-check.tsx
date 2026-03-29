"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function DbHealthCheck() {
  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        if (data.db === "connected") {
          toast.success("DB connected", { duration: 3000 });
        } else {
          console.error("[DbHealthCheck] error:", data);
          toast.error(`DB error: ${data.message ?? "unreachable"}`, {
            duration: 0,
            description: data.stack ? data.stack.split("\n").slice(0, 3).join(" | ") : undefined,
          });
        }
      })
      .catch((err) => {
        console.error("[DbHealthCheck] fetch failed:", err);
        toast.error(`DB unreachable: ${err.message}`, { duration: 0 });
      });
  }, []);

  return null;
}
