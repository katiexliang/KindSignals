// Dashboard calendar merging wearable data points + journal entries. Instead of
// raw numbers, selecting a day shows a short, descriptive insight for that day
// (built server-side from the day's data + journal). Descriptive, never causal.

import { useMemo, useState } from "react";
import type { DayInsight } from "../lib/types";

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

export function DayInsightCalendar({ days }: { days: DayInsight[] }) {
  const byDate = useMemo(() => {
    const m = new Map<string, DayInsight>();
    for (const d of days) m.set(d.date, d);
    return m;
  }, [days]);

  const initial = useMemo(() => {
    const withData = days.filter((d) => d.has_metrics || d.has_journal);
    const last = withData[withData.length - 1] ?? days[days.length - 1];
    const base = last ? new Date(last.date + "T00:00:00") : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  }, [days]);

  const [month, setMonth] = useState<Date>(initial);
  const [selected, setSelected] = useState<string | null>(null);

  const year = month.getFullYear();
  const mIndex = month.getMonth();
  const firstWeekday = new Date(year, mIndex, 1).getDay();
  const daysInMonth = new Date(year, mIndex + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const sel = selected ? byDate.get(selected) : undefined;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Left: calendar */}
      <div className="w-full lg:w-72 lg:flex-shrink-0">
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
            const d = byDate.get(iso);
            const hasData = d && (d.has_metrics || d.has_journal);
            const isSel = selected === iso;
            const base =
              "relative flex aspect-square items-center justify-center rounded-md text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-deepsage-300";
            if (!hasData) {
              return (
                <div key={iso} className={`${base} text-charcoal/30`} title="No data">
                  {day}
                </div>
              );
            }
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelected(isSel ? null : iso)}
                className={`${base} font-semibold ${
                  isSel
                    ? "bg-deepsage-500 text-white"
                    : "bg-sage-200 text-deepsage-800 hover:bg-sage-300"
                }`}
                title={d?.headline}
              >
                {day}
                {/* dot: journal entry present */}
                {d?.has_journal && (
                  <span
                    className="absolute bottom-0.5 h-1 w-1 rounded-full bg-rose-400"
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-charcoal/50">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-sage-200" /> has data
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> journal entry
          </span>
        </div>
      </div>

      {/* Right: the day's insight */}
      <div className="min-w-0 flex-1">
        {sel ? (
          <div className="h-full rounded-xl bg-sage-50 p-5 ring-1 ring-sage-200">
            <p className="text-sm font-semibold text-deepsage-700">
              {new Date(sel.date + "T00:00:00").toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <p className="mt-2 text-sm font-medium text-charcoal">
              {sel.headline}
            </p>
            {sel.details.length > 0 && (
              <ul className="mt-3 space-y-1.5 text-sm text-charcoal/80">
                {sel.details.map((d, i) => (
                  <li key={i}>• {d}</li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs text-charcoal/50">
              A descriptive summary of this day — not a diagnosis.
            </p>
          </div>
        ) : (
          <div className="flex h-full min-h-[12rem] flex-col items-center justify-center rounded-xl border border-dashed border-sage-200 p-6 text-center">
            <p className="text-sm font-medium text-charcoal/60">
              Select a day for its insight
            </p>
            <p className="mt-1 text-xs text-charcoal/40">
              Each day blends your wearable readings and journal into a short,
              plain-language takeaway.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
