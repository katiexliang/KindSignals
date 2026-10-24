import type { MetricStat } from "../lib/types";
import { EMPTY, fmtMinutesAsHours, fmtNumber } from "../lib/format";

interface MetricCardProps {
  stat: MetricStat;
}

function displayValue(stat: MetricStat, value: number | null): string {
  if (value === null) return EMPTY;
  if (stat.key === "sleep_duration") return fmtMinutesAsHours(value);
  const digits = stat.unit === "ms" || stat.key === "strain" ? 1 : 0;
  const num = fmtNumber(value, digits);
  return stat.unit && stat.unit !== "min" ? `${num}${unitSuffix(stat.unit)}` : num;
}

function unitSuffix(unit: string): string {
  return unit === "%" ? "%" : ` ${unit}`;
}

export function MetricCard({ stat }: MetricCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{stat.label}</p>
        {stat.coverage_pct < 70 && (
          <span
            className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700"
            title="Fewer than 70% of days have this measurement."
          >
            low coverage
          </span>
        )}
      </div>

      <p className="mt-2 text-3xl font-bold text-slate-800">
        {displayValue(stat, stat.latest)}
      </p>

      <dl className="mt-3 space-y-1 text-xs text-slate-500">
        <div className="flex justify-between">
          <dt>Baseline (avg)</dt>
          <dd className="font-medium text-slate-600">
            {displayValue(stat, stat.baseline)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>Days with data</dt>
          <dd className="font-medium text-slate-600">
            {stat.sample_size} · {fmtNumber(stat.coverage_pct, 0)}%
          </dd>
        </div>
      </dl>
    </div>
  );
}
