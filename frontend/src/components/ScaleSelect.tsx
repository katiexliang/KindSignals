// A 0-5 optional selector. "—" clears the value back to not-reported (null).

interface ScaleSelectProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  hint?: string;
}

export function ScaleSelect({ label, value, onChange, hint }: ScaleSelectProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`h-9 w-9 rounded-lg text-sm font-medium transition ${
            value === null
              ? "bg-slate-200 text-slate-700"
              : "bg-sand-50 text-slate-400 hover:bg-slate-100"
          }`}
          title="Not reported"
        >
          —
        </button>
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`h-9 w-9 rounded-lg text-sm font-medium transition ${
              value === n
                ? "bg-brand-500 text-white"
                : "bg-brand-50 text-brand-700 hover:bg-brand-100"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
