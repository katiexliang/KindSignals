import type { RecentSymptom } from "../lib/types";
import { fmtDate } from "../lib/format";

interface SymptomListProps {
  symptoms: RecentSymptom[];
}

export function SymptomList({ symptoms }: SymptomListProps) {
  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-slate-700">
        Recent reported symptoms
      </h3>
      {symptoms.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          No symptoms reported recently. Blank days are not counted as
          symptom-free.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {symptoms.map((s, i) => (
            <li
              key={`${s.date}-${s.label}-${i}`}
              className="flex items-center justify-between rounded-xl bg-sand-50 px-3 py-2 text-sm"
            >
              <span className="font-medium text-slate-700">{s.label}</span>
              <span className="flex items-center gap-3">
                <span className="text-slate-600">{s.value}/5</span>
                <span className="text-xs text-slate-400">{fmtDate(s.date)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-slate-400">
        Only days you reported are shown. Missing days mean “not reported,” not
        “no symptom.”
      </p>
    </div>
  );
}
