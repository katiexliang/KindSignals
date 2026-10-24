// Lower-center dashboard card: today's journal status + latest entry summary.
// Reads /api/journal. "Not completed" never implies a normal/symptom-free day.

import { Link } from "react-router-dom";
import { StateBlock } from "./StateBlock";
import { api } from "../lib/api";
import { useAsync } from "../lib/useAsync";
import { fmtDate } from "../lib/format";
import type { JournalEntry } from "../lib/types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// Build a short, human summary of reported fields in an entry.
function summarize(entry: JournalEntry): string {
  const parts: string[] = [];
  if (entry.mood !== null && entry.mood !== undefined)
    parts.push(`mood ${entry.mood}/5`);
  if (entry.fatigue !== null && entry.fatigue !== undefined)
    parts.push(`fatigue ${entry.fatigue}/5`);
  if (entry.stress !== null && entry.stress !== undefined)
    parts.push(`stress ${entry.stress}/5`);
  if (entry.menstrual_flow) parts.push(`flow: ${entry.menstrual_flow}`);
  return parts.length ? parts.join(" · ") : "Entry saved (no scaled fields).";
}

export function JournalCard() {
  const journal = useAsync<JournalEntry[]>(() => api.getJournal());

  const entries = journal.data ?? [];
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));
  const latest = sorted[0];
  const doneToday = entries.some((e) => e.date === todayIso());

  return (
    <div className="card card-hover flex h-full flex-col">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-200 text-rose-400">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M5 3h11l3 3v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm3 6h8v2H8V9zm0 4h8v2H8v-2z" />
          </svg>
        </span>
        <h2 className="text-base font-semibold text-charcoal">Journal</h2>
      </div>

      <div className="mt-4 flex-1">
        {journal.loading ? (
          <StateBlock kind="loading" />
        ) : journal.error ? (
          <StateBlock kind="error" message={journal.error} />
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                  doneToday
                    ? "bg-sage-200 text-deepsage-700"
                    : "bg-rose-100 text-rose-400"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    doneToday ? "bg-deepsage-500" : "bg-rose-300"
                  }`}
                />
                {doneToday ? "Today's journal is done" : "Not completed today"}
              </span>
            </div>

            {latest ? (
              <div className="mt-3 rounded-xl bg-sage-50 p-3 text-sm text-charcoal/80">
                <p className="text-xs font-medium text-deepsage-600">
                  Latest entry · {fmtDate(latest.date)}
                </p>
                <p className="mt-1">{summarize(latest)}</p>
              </div>
            ) : (
              <p className="mt-3 rounded-xl bg-sage-50 p-3 text-sm text-charcoal/70">
                No entries yet. Logging is voluntary — track what feels useful.
              </p>
            )}
          </>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          to="/journal"
          className="inline-flex items-center gap-1 rounded-full bg-rose-300 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
        >
          Complete Today's Journal
        </Link>
        <Link
          to="/journal"
          className="text-sm font-medium text-deepsage-600 underline-offset-2 hover:underline"
        >
          Previous entries
        </Link>
      </div>
    </div>
  );
}
