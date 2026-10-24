// KindSignals dashboard. Layout follows the approved wireframe:
//   welcome banner -> five metric cards -> [Daily Insights | Journal | Buddy].
// Metric data comes from the backend; missing values render as
// "No data available" and are never fabricated.

import { WelcomeBanner } from "../components/WelcomeBanner";
import { HealthMetricsGrid } from "../components/HealthMetricsGrid";
import { DayInsightCalendar } from "../components/DayInsightCalendar";
import { DailyInsightsCard } from "../components/DailyInsightsCard";
import { JournalCard } from "../components/JournalCard";
import { PMOSBuddyCard } from "../components/PMOSBuddyCard";
import { Disclaimer } from "../components/Disclaimer";
import { StateBlock } from "../components/StateBlock";
import { api } from "../lib/api";
import { useAsync } from "../lib/useAsync";
import type {
  DayInsightsResponse,
  MetricsSummary,
  MetricsTrends,
} from "../lib/types";

function firstName(full: string | undefined): string | null {
  if (!full) return null;
  return full.trim().split(/\s+/)[0] ?? null;
}

export function Dashboard() {
  const summary = useAsync<MetricsSummary>(() => api.getMetricsSummary());
  const trends = useAsync<MetricsTrends>(() => api.getMetricsTrends());
  const dayInsights = useAsync<DayInsightsResponse>(() => api.getDayInsights());

  return (
    <div className="space-y-6">
      <div data-tour="welcome">
        <WelcomeBanner firstName={firstName(summary.data?.user.name)} />
      </div>

      {/* First row: five metric cards */}
      {summary.loading ? (
        <StateBlock kind="loading" />
      ) : summary.error ? (
        <StateBlock kind="error" message={summary.error} />
      ) : summary.data ? (
        <div data-tour="metrics">
          <HealthMetricsGrid summary={summary.data} trends={trends.data} />
        </div>
      ) : null}

      {/* Daily insight calendar: merges wearable + journal into per-day insights */}
      {dayInsights.data && (
        <section className="card">
          <h2 className="text-base font-semibold text-deepsage-700">
            Your days at a glance
          </h2>
          <p className="mt-1 text-sm text-charcoal/60">
            Pick a day to see a short insight from that day's wearable readings
            and journal — not the raw numbers.
          </p>
          <div className="mt-4">
            <DayInsightCalendar days={dayInsights.data.days} />
          </div>
        </section>
      )}

      {/* Second row: Daily Insights (40%) | Journal (40%) | Buddy (20%) */}
      <section className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2" data-tour="insights">
          <DailyInsightsCard />
        </div>
        <div className="lg:col-span-2" data-tour="journal">
          <JournalCard />
        </div>
        <div className="lg:col-span-1">
          <PMOSBuddyCard />
        </div>
      </section>

      <Disclaimer className="pt-2" />
    </div>
  );
}
