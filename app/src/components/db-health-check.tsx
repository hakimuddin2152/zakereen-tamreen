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
          toast.error(`DB error: ${data.message ?? "unreachable"}`, { duration: 0 });
        }
      })
      .catch(() => {
        toast.error("DB unreachable", { duration: 0 });
      });
  }, []);

  return null;
}
