// Lower-left dashboard card: a short, descriptive summary of recent patterns.
// Pulls from /api/insights and shows at most two observations. Never implies
// causation; falls back to a friendly "need more data" message.

import { Link } from "react-router-dom";
import { StateBlock } from "./StateBlock";
import { api } from "../lib/api";
import { useAsync } from "../lib/useAsync";
import type { InsightsResponse } from "../lib/types";

export function DailyInsightsCard() {
  const insights = useAsync<InsightsResponse>(() => api.getInsights());

  const observations: string[] = [];
  if (insights.data) {
    const usable = insights.data.trends.filter(
      (t) => t.direction !== "insufficient data",
    );
    const confident = usable.filter((t) => !t.low_confidence);
    for (const t of (confident.length ? confident : usable).slice(0, 2)) {
      observations.push(t.description);
    }
  }

  return (
    <div className="card card-hover flex h-full flex-col">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sage-200 text-deepsage-700">
          {/* simple spark icon */}
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M12 2l2.1 5.5L20 9l-4.5 3.4L17 18l-5-3-5 3 1.5-5.6L4 9l5.9-1.5z" />
          </svg>
        </span>
        <h2 className="text-base font-semibold text-charcoal">Daily Insights</h2>
      </div>

      <div className="mt-4 flex-1">
        {insights.loading ? (
          <StateBlock kind="loading" />
        ) : insights.error ? (
          <StateBlock kind="error" message={insights.error} />
        ) : observations.length > 0 ? (
          <ul className="space-y-3">
            {observations.map((text, i) => (
              <li
                key={i}
                className="rounded-xl bg-sage-50 p-3 text-sm text-charcoal/80"
              >
                {text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl bg-sage-50 p-3 text-sm text-charcoal/70">
            Not enough observations yet. Keep logging journal entries and
            wearing your device so patterns can emerge. These are descriptive
            observations, not diagnoses.
          </p>
        )}
      </div>

      <Link
        to="/signals"
        className="mt-4 inline-flex w-fit items-center gap-1 rounded-full bg-deepsage-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-deepsage-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-deepsage-300"
      >
        Open Signals
      </Link>
    </div>
  );
}
