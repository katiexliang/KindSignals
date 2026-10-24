// Connected apps: data sources the user grants permission to (WHOOP, Apple
// Health, Samsung Health). WHOOP is connectable in the demo (attaches synthetic
// data); Apple/Samsung are presented as upcoming "ask to connect" integrations.

import { useEffect, useState } from "react";
import { StateBlock } from "./StateBlock";
import { api, ApiError } from "../lib/api";
import type { ProviderInfo } from "../lib/types";

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { text: string; cls: string; dot: string }> = {
    connected: {
      text: "Connected",
      cls: "bg-sage-200 text-deepsage-700",
      dot: "bg-deepsage-500",
    },
    not_connected: {
      text: "Not connected",
      cls: "bg-white text-charcoal/60 ring-1 ring-black/10",
      dot: "bg-charcoal/30",
    },
    coming_soon: {
      text: "Coming soon",
      cls: "bg-rose-100 text-rose-400",
      dot: "bg-rose-300",
    },
  };
  const s = map[status] ?? map.not_connected;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${s.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.text}
    </span>
  );
}

export function ConnectedApps() {
  const [providers, setProviders] = useState<ProviderInfo[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .getProviders()
      .then((r) => active && setProviders(r.providers))
      .catch((e) =>
        active &&
        setError(e instanceof ApiError ? e.message : "Could not load sources"),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  async function act(provider: string, connected: boolean) {
    setBusy(provider);
    setActionError(null);
    try {
      const r = connected
        ? await api.disconnectProvider(provider)
        : await api.connectProvider(provider);
      setProviders(r.providers);
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="card">
      <h2 className="text-base font-semibold text-deepsage-700">Connected apps</h2>
      <p className="mt-1 text-sm text-charcoal/60">
        Grant permission to connect a data source. In this demo, WHOOP is
        connected with synthetic data. Apple Health and Samsung Health will ask
        for permission in a future release.
      </p>

      {loading ? (
        <div className="mt-4">
          <StateBlock kind="loading" />
        </div>
      ) : error ? (
        <div className="mt-4">
          <StateBlock kind="error" message={error} />
        </div>
      ) : providers ? (
        <ul className="mt-4 space-y-3">
          {providers.map((p) => {
            const connected = p.status === "connected";
            return (
              <li
                key={p.provider}
                className="rounded-xl bg-sage-50 p-4 ring-1 ring-sage-200"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-deepsage-500 text-xs font-bold text-white">
                      {p.name.charAt(0)}
                    </span>
                    <span className="text-sm font-semibold text-charcoal">
                      {p.name}
                    </span>
                    <StatusPill status={p.status} />
                  </div>

                  {p.connectable ? (
                    <button
                      type="button"
                      disabled={busy === p.provider}
                      onClick={() => act(p.provider, connected)}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold transition disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-deepsage-300 ${
                        connected
                          ? "border border-black/10 bg-white text-charcoal/70 hover:bg-sage-100"
                          : "bg-deepsage-500 text-white hover:bg-deepsage-600"
                      }`}
                    >
                      {busy === p.provider
                        ? "…"
                        : connected
                          ? "Disconnect"
                          : "Connect"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title="Coming soon"
                      className="cursor-not-allowed rounded-full border border-black/10 bg-white px-4 py-1.5 text-xs font-semibold text-charcoal/40"
                    >
                      Ask to connect
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-charcoal/60">
                  {p.detail}
                </p>
              </li>
            );
          })}
        </ul>
      ) : null}

      {actionError && (
        <p className="mt-3 text-sm text-rose-400">{actionError}</p>
      )}
    </section>
  );
}
