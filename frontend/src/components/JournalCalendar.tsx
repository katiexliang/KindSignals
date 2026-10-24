// Month calendar of journal entries, with that day's wearable readings merged
// into the detail panel. Only days with a completed journal entry are
// highlighted/clickable. Blank days mean "not reported", never "no symptom".

import { useMemo, useState } from "react";
import type { JournalEntry, MetricsTrends } from "../lib/types";
import { fmtMinutesAsHours, fmtNumber } from "../lib/format";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const UNIT_BY_KEY: Record<string, string> = {
  recovery: "%",
  hrv: "ms",
  resting_hr: "bpm",
  sleep_efficiency: "%",
  // sleep_duration -> hours/minutes; strain -> unitless.
};

function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtWearable(key: string, value: number): string {
  if (key === "sleep_duration") return fmtMinutesAsHours(value);
  const digits = key === "hrv" || key === "strain" ? 1 : 0;
  const num = fmtNumber(value, digits);
  const unit = UNIT_BY_KEY[key];
  return unit ? `${num} ${unit}` : num;
}

function summarize(entry: JournalEntry): string {
  const parts: string[] = [];
  const scales: [keyof JournalEntry, string][] = [
    ["fatigue", "fatigue"],
    ["mood", "mood"],
    ["stress", "stress"],
    ["acne", "acne"],
    ["sleep_quality", "sleep"],
  ];
  for (const [key, label] of scales) {
    const v = entry[key];
    if (v !== null && v !== undefined) parts.push(`${label} ${v}/5`);
  }
  if (entry.menstrual_flow) parts.push(`flow ${entry.menstrual_flow}`);
  if (entry.contraception) parts.push(`contraception: ${entry.contraception}`);
  return parts.length ? parts.join(" · ") : "no scaled fields reported";
}

function detailRows(e: JournalEntry): { label: string; value: string }[] {
  const dash = "—";
  const scale = (v: number | null | undefined) =>
    v === null || v === undefined ? dash : `${v}/5`;
  return [
    { label: "Mood", value: scale(e.mood) },
    { label: "Fatigue", value: scale(e.fatigue) },
    { label: "Stress", value: scale(e.stress) },
    { label: "Acne", value: scale(e.acne) },
    { label: "Sleep quality", value: scale(e.sleep_quality) },
    { label: "Flow", value: e.menstrual_flow || dash },
    { label: "Contraception", value: e.contraception || dash },
  ];
}

export function JournalCalendar({
  entries,
  trends,
}: {
  entries: JournalEntry[];
  trends?: MetricsTrends | null;
}) {
  const byDate = useMemo(() => {
    const m = new Map<string, JournalEntry>();
    for (const e of entries) m.set(e.date, e);
    return m;
  }, [entries]);

  // ISO date -> wearable readings for that day (merged across metric series).
  const wearableByDate = useMemo(() => {
    const m = new Map<string, { key: string; label: string; value: number }[]>();
    if (!trends) return m;
    for (const series of trends.series) {
      for (const pt of series.points) {
        if (pt.value === null) continue;
        const row = m.get(pt.date) ?? [];
        row.push({ key: series.key, label: series.label, value: pt.value });
        m.set(pt.date, row);
      }
    }
    return m;
  }, [trends]);

  const initial = useMemo(() => {
    const latest = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    const base = latest ? new Date(latest.date + "T00:00:00") : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  }, [entries]);

  const [month, setMonth] = useState<Date>(initial);
  const [selected, setSelected] = useState<string | null>(null);

  const year = month.getFullYear();
  const mIndex = month.getMonth();
  const firstWeekday = new Date(year, mIndex, 1).getDay();
  const daysInMonth = new Date(year, mIndex + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedEntry = selected ? byDate.get(selected) : undefined;
  const selectedWearable = selected ? wearableByDate.get(selected) : undefined;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Left: compact calendar */}
      <div className="w-full lg:w-72 lg:flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-deepsage-700">Past entries</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setMonth(new Date(year, mIndex - 1, 1))}
              className="rounded-full border border-black/10 px-2 py-0.5 text-sm text-charcoal/70 transition hover:bg-sage-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-deepsage-300"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setMonth(new Date(year, mIndex + 1, 1))}
              className="rounded-full border border-black/10 px-2 py-0.5 text-sm text-charcoal/70 transition hover:bg-sage-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-deepsage-300"
            >
              ›
            </button>
          </div>
        </div>
        <p className="mt-1 text-xs font-medium text-charcoal/60">
          {MONTHS[mIndex]} {year}
        </p>

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
            const entry = byDate.get(iso);
            const isSelected = selected === iso;
            const base =
              "relative flex h-8 w-8 items-center justify-center rounded-md text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-deepsage-300";
            // Only days with a completed journal entry are highlighted/clickable.
            if (!entry) {
              return (
                <div
                  key={iso}
                  className={`${base} text-charcoal/40`}
                  title="No journal entry for this day"
                >
                  {day}
                </div>
              );
            }
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelected(isSelected ? null : iso)}
                className={`${base} font-semibold ${
                  isSelected
                    ? "bg-deepsage-500 text-white"
                    : "bg-sage-200 text-deepsage-800 hover:bg-sage-300"
                }`}
                title={summarize(entry)}
              >
                {day}
                {entry.contraception && (
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
            <span className="h-3 w-3 rounded bg-sage-200" /> journal entry
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-black/10" /> none
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> contraception
          </span>
        </div>
      </div>

      {/* Right: merged detail panel (journal + that day's wearable readings) */}
      <div className="min-w-0 flex-1">
        {selectedEntry && selected ? (
          <div className="h-full rounded-xl bg-sage-50 p-5 ring-1 ring-sage-200">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-deepsage-700">
                {new Date(selected + "T00:00:00").toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </h3>
              {selectedEntry.is_synthetic && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] text-rose-400">
                  demo
                </span>
              )}
            </div>

            {/* Journal */}
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-deepsage-600/70">
              Journal
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              {detailRows(selectedEntry).map((row) => (
                <div key={row.label}>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-deepsage-600/70">
                    {row.label}
                  </dt>
                  <dd className="mt-0.5 text-sm text-charcoal/90">{row.value}</dd>
                </div>
              ))}
            </dl>

            {(selectedEntry.other_symptoms ||
              selectedEntry.cycle_notes ||
              selectedEntry.lifestyle_factors) && (
              <div className="mt-3 space-y-2">
                {selectedEntry.other_symptoms && (
                  <p className="text-xs text-charcoal/70">
                    <span className="font-medium">Other symptoms:</span>{" "}
                    {selectedEntry.other_symptoms}
                  </p>
                )}
                {selectedEntry.cycle_notes && (
                  <p className="text-xs text-charcoal/70">
                    <span className="font-medium">Cycle notes:</span>{" "}
                    {selectedEntry.cycle_notes}
                  </p>
                )}
                {selectedEntry.lifestyle_factors && (
                  <p className="text-xs text-charcoal/70">
                    <span className="font-medium">Lifestyle:</span>{" "}
                    {selectedEntry.lifestyle_factors}
                  </p>
                )}
              </div>
            )}

            {/* Wearable readings merged for the same day */}
            {selectedWearable && selectedWearable.length > 0 && (
              <div className="mt-4 border-t border-sage-200 pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-deepsage-600/70">
                  Wearable
                </p>
                <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                  {selectedWearable.map((w) => (
                    <div key={w.key}>
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-deepsage-600/70">
                        {w.label}
                      </dt>
                      <dd className="mt-0.5 text-sm text-charcoal/90">
                        {fmtWearable(w.key, w.value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full min-h-[12rem] flex-col items-center justify-center rounded-xl border border-dashed border-sage-200 p-6 text-center">
            <p className="text-sm font-medium text-charcoal/60">
              Select a day to see its details
            </p>
            <p className="mt-1 text-xs text-charcoal/40">
              Only days with a journal entry are highlighted. Blank days mean
              “not reported.”
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
