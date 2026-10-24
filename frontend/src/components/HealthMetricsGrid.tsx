// Builds the five dashboard metric cards (Recovery, HRV, Resting HR, Sleep,
// Daily Strain) from the backend metrics summary. Missing metrics render as
// "No data available" — values are never invented.

import { useState } from "react";
import { HealthMetricCard } from "./HealthMetricCard";
import { MetricCalendar } from "./MetricCalendar";
import type {
  MetricStat,
  MetricsSummary,
  MetricsTrends,
  TrendSeries,
} from "../lib/types";
import { fmtMinutesAsHours, fmtNumber } from "../lib/format";

function byKey(stats: MetricStat[], key: string): MetricStat | undefined {
  return stats.find((s) => s.key === key);
}

function has(stat: MetricStat | undefined): stat is MetricStat {
  return !!stat && stat.latest !== null;
}

// Compare latest vs baseline for an arrow + delta line.
function baselineLine(
  stat: MetricStat | undefined,
  digits = 0,
  unit = "",
): { trend: "up" | "down" | "flat" | null; text: string | null } {
  if (!stat || stat.latest === null || stat.baseline === null) {
    return { trend: null, text: null };
  }
  const delta = stat.latest - stat.baseline;
  const trend = Math.abs(delta) < 0.05 ? "flat" : delta > 0 ? "up" : "down";
  const sign = delta > 0 ? "+" : "";
  return {
    trend,
    text: `${sign}${fmtNumber(delta, digits)}${unit} vs baseline ${fmtNumber(
      stat.baseline,
      digits,
    )}${unit}`,
  };
}

function strainLabel(score: number): string {
  if (score < 10) return "Light day";
  if (score < 14) return "Moderate";
  if (score < 18) return "Strenuous";
  return "All out";
}

export function HealthMetricsGrid({
  summary,
  trends,
}: {
  summary: MetricsSummary;
  trends?: MetricsTrends | null;
}) {
  const stats = summary.stats;
  const [openKey, setOpenKey] = useState<string | null>(null);

  const seriesByKey = (key: string): TrendSeries | undefined =>
    trends?.series.find((s) => s.key === key);
  const open = (key: string) => trends && setOpenKey(key);
  const openSeries = openKey ? seriesByKey(openKey) : undefined;

  const recovery = byKey(stats, "recovery");
  const hrv = byKey(stats, "hrv");
  const restingHr = byKey(stats, "resting_hr");
  const sleepDur = byKey(stats, "sleep_duration");
  const sleepEff = byKey(stats, "sleep_efficiency");
  const strain = byKey(stats, "strain");

  // Recovery status band.
  const recoveryStatus =
    has(recovery) && recovery.latest !== null
      ? recovery.latest >= 67
        ? { text: "In the green", tone: "text-emerald-700" }
        : recovery.latest >= 34
          ? { text: "In the yellow", tone: "text-amber-700" }
          : { text: "In the red", tone: "text-rose-400" }
      : null;

  const hrvBaseline = baselineLine(hrv, 0, " ms");
  const rhrBaseline = baselineLine(restingHr, 0, " bpm");

  return (
    <>
    <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {/* Recovery */}
      <HealthMetricCard
        label="Recovery"
        hasData={has(recovery)}
        onClick={trends ? () => open("recovery") : undefined}
        value={has(recovery) ? fmtNumber(recovery.latest, 0) : ""}
        unit="%"
        footnote={
          recoveryStatus && (
            <span className={`font-medium ${recoveryStatus.tone}`}>
              {recoveryStatus.text}
            </span>
          )
        }
      />

      {/* HRV */}
      <HealthMetricCard
        label="HRV"
        hasData={has(hrv)}
        onClick={trends ? () => open("hrv") : undefined}
        value={has(hrv) ? fmtNumber(hrv.latest, 0) : ""}
        unit="ms"
        trend={hrvBaseline.trend}
        footnote={hrvBaseline.text}
      />

      {/* Resting HR */}
      <HealthMetricCard
        label="Resting HR"
        hasData={has(restingHr)}
        onClick={trends ? () => open("resting_hr") : undefined}
        value={has(restingHr) ? fmtNumber(restingHr.latest, 0) : ""}
        unit="bpm"
        trend={rhrBaseline.trend}
        footnote={rhrBaseline.text}
      />

      {/* Sleep (duration + efficiency) */}
      <HealthMetricCard
        label="Sleep"
        hasData={has(sleepDur)}
        onClick={trends ? () => open("sleep_duration") : undefined}
        value={has(sleepDur) ? fmtMinutesAsHours(sleepDur.latest) : ""}
        footnote={
          has(sleepEff) && sleepEff.latest !== null
            ? `${fmtNumber(sleepEff.latest, 0)}% efficiency`
            : null
        }
      />

      {/* Daily Strain */}
      <HealthMetricCard
        label="Daily Strain"
        hasData={has(strain)}
        onClick={trends ? () => open("strain") : undefined}
        value={has(strain) ? fmtNumber(strain.latest, 1) : ""}
        footnote={
          has(strain) && strain.latest !== null ? strainLabel(strain.latest) : null
        }
      />
    </section>

    {openSeries && (
      <div
        className="fixed inset-0 z-40 flex items-center justify-center bg-charcoal/50 p-4"
        onClick={() => setOpenKey(null)}
      >
        <div
          className="w-full max-w-md rounded-2xl bg-white p-5 shadow-soft"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-deepsage-700">
              {openSeries.label} by day
            </h3>
            <button
              type="button"
              onClick={() => setOpenKey(null)}
              aria-label="Close"
              className="rounded-full px-2 text-lg text-charcoal/50 hover:text-charcoal"
            >
              ×
            </button>
          </div>
          <div className="mt-3">
            <MetricCalendar series={openSeries} />
          </div>
        </div>
      </div>
    )}
    </>
  );
}
