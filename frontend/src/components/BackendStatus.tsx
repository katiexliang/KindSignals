// Calls /api/health on mount and shows a connected / disconnected indicator.
// Never throws to the render tree: failures degrade to a "disconnected" state.

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { HealthStatus } from "../lib/types";

type Status = "checking" | "connected" | "disconnected";

export function BackendStatus() {
  const [status, setStatus] = useState<Status>("checking");
  const [info, setInfo] = useState<HealthStatus | null>(null);

  useEffect(() => {
    let active = true;
    api
      .getHealth()
      .then((data) => {
        if (!active) return;
        setInfo(data);
        setStatus("connected");
      })
      .catch(() => {
        if (!active) return;
        setStatus("disconnected");
      });
    return () => {
      active = false;
    };
  }, []);

  const config = {
    checking: { dot: "bg-slate-300", text: "Checking backend…", tone: "text-slate-500" },
    connected: { dot: "bg-emerald-500", text: "Backend connected", tone: "text-emerald-700" },
    disconnected: { dot: "bg-amber-500", text: "Backend unreachable", tone: "text-amber-700" },
  }[status];

  return (
    <div
      className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium ring-1 ring-slate-100"
      title={
        status === "connected" && info
          ? `${info.service} v${info.version}`
          : api.baseUrl
      }
    >
      <span className={`h-2 w-2 rounded-full ${config.dot}`} />
      <span className={config.tone}>{config.text}</span>
    </div>
  );
}
