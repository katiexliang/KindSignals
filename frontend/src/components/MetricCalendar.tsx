// A month calendar showing one wearable metric's value per day. Days with a
// reading are shaded (darker = higher within the metric's own range) and show
// the value; missing days are blank ("not reported", never zero). Clicking a
// day reveals its exact value.

import { useMemo, useState } from "react";
import type { TrendSeries } from "../lib/types";
import { fmtMinutesAsHours, fmtNumber } from "../lib/format";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatValue(series: TrendSeries, v: number): string {
  if (series.key === "sleep_duration") return fmtMinutesAsHours(v);
  const digits = series.unit === "ms" || series.key === "strain" ? 1 : 0;
  const num = fmtNumber(v, digits);
  return series.unit && series.unit !== "min" ? `${num} ${series.unit}` : num;
}

export function MetricCalendar({
  series,
  split = false,
}: {
  series: TrendSeries;
  split?: boolean;
}) {
  const byDate = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of series.points) if (p.value !== null) m.set(p.date, p.value);
    return m;
  }, [series]);

  // Value range (for shading intensity).
  const { lo, hi } = useMemo(() => {
    const vals = series.points
      .map((p) => p.value)
      .filter((v): v is number => v !== null);
    return vals.length
      ? { lo: Math.min(...vals), hi: Math.max(...vals) }
      : { lo: 0, hi: 1 };
  }, [series]);

  const initial = useMemo(() => {
    const withVal = series.points.filter((p) => p.value !== null);
    const last = withVal[withVal.length - 1];
    const base = last ? new Date(last.date + "T00:00:00") : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  }, [series]);

  const [month, setMonth] = useState<Date>(initial);
  const [selected, setSelected] = useState<string | null>(null);

  const year = month.getFullYear();
  const mIndex = month.getMonth();
  const firstWeekday = new Date(year, mIndex, 1).getDay();
  const daysInMonth = new Date(year, mIndex + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selVal = selected ? byDate.get(selected) : undefined;

  const detail =
    selVal !== undefined ? (
      <div className="rounded-lg bg-sage-50 px-4 py-3 text-sm ring-1 ring-sage-200">
        <p className="text-sm font-semibold text-deepsage-700">
          {selected &&
            new Date(selected + "T00:00:00").toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
        </p>
        <p className="mt-1 text-charcoal/80">
          {series.label}:{" "}
          <span className="font-medium">{formatValue(series, selVal)}</span>
        </p>
      </div>
    ) : (
      <p className="text-xs text-charcoal/50">
        Tap a day to see its {series.label.toLowerCase()} reading. Blank days had
        no reading.
      </p>
    );

  const calendar = (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-charcoal">
          {MONTHS[mIndex]} {year}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setMonth(new Date(year, mIndex - 1, 1))}
            className="rounded-full border border-black/10 px-2 py-0.5 text-sm text-charcoal/70 transition hover:bg-sage-50"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setMonth(new Date(year, mIndex + 1, 1))}
            className="rounded-full border border-black/10 px-2 py-0.5 text-sm text-charcoal/70 transition hover:bg-sage-50"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-charcoal/40">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const iso = isoDay(new Date(year, mIndex, day));
          const v = byDate.get(iso);
          const isSel = selected === iso;
          const base =
            "flex aspect-square flex-col items-center justify-center rounded-md text-[10px] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-deepsage-300";
          if (v === undefined) {
            return (
              <div
                key={iso}
                className={`${base} text-charcoal/30`}
                title="No reading"
              >
                {day}
              </div>
            );
          }
          return (
            <button
              key={iso}
              type="button"
              onClick={() => setSelected(isSel ? null : iso)}
              title={`${iso}: ${formatValue(series, v)}`}
              className={`${base} font-semibold ${
                isSel ? "ring-2 ring-deepsage-500" : ""
              }`}
              style={{
                backgroundColor: `rgba(82, 121, 111, ${shade(v)})`,
                color: shade(v) > 0.55 ? "white" : "#293b37",
              }}
            >
              <span>{day}</span>
            </button>
          );
        })}
      </div>

      {/* Color key: what the shading means */}
      <div className="mt-3">
        <div className="flex items-center gap-2 text-[11px] text-charcoal/60">
          <span>Lower</span>
          <span
            className="h-3 flex-1 rounded"
            style={{
              background:
                "linear-gradient(to right, rgba(82,121,111,0.2), rgba(82,121,111,0.9))",
            }}
          />
          <span>Higher</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] text-charcoal/40">
          <span>{formatValue(series, lo)}</span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded border border-black/10" /> no reading
          </span>
          <span>{formatValue(series, hi)}</span>
        </div>
      </div>
    </div>
  );

  function shade(v: number): number {
    if (hi === lo) return 0.5;
    return 0.2 + 0.7 * ((v - lo) / (hi - lo));
  }

  if (split) {
    return (
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="w-full lg:w-72 lg:flex-shrink-0">{calendar}</div>
        <div className="min-w-0 flex-1">
          {selVal !== undefined ? (
            detail
          ) : (
            <div className="flex h-full min-h-[12rem] flex-col items-center justify-center rounded-xl border border-dashed border-sage-200 p-6 text-center">
              <p className="text-sm font-medium text-charcoal/60">
                Select a day to see its reading
              </p>
              <p className="mt-1 text-xs text-charcoal/40">
                Darker = higher. Blank days had no reading.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {calendar}
      <div className="mt-3">{detail}</div>
    </div>
  );
}
