import { useEffect, useState } from "react";
import { ScaleSelect } from "../components/ScaleSelect";
import { JournalCalendar } from "../components/JournalCalendar";
import { PageHeader } from "../components/PageHeader";
import { Disclaimer } from "../components/Disclaimer";
import { StateBlock } from "../components/StateBlock";
import { api } from "../lib/api";
import { ApiError } from "../lib/api";
import { useAsync } from "../lib/useAsync";
import type {
  JournalEntry,
  JournalEntryInput,
  MetricsTrends,
  UserOut,
} from "../lib/types";

const FLOW_OPTIONS = ["none", "spotting", "light", "medium", "heavy"];
const CONTRACEPTION_DAY_OPTIONS = ["taken", "missed", "n/a"];
const SCALES: { key: keyof JournalEntryInput; label: string }[] = [
  { key: "fatigue", label: "Fatigue" },
  { key: "mood", label: "Mood" },
  { key: "stress", label: "Stress" },
  { key: "acne", label: "Acne" },
  { key: "sleep_quality", label: "Sleep quality" },
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): JournalEntryInput {
  return {
    date: today(),
    menstrual_flow: null,
    cycle_notes: null,
    contraception: null,
    recovery_score: null,
    resting_hr: null,
    hrv_ms: null,
    sleep_duration_min: null,
    sleep_efficiency_pct: null,
    strain: null,
    fatigue: null,
    mood: null,
    stress: null,
    acne: null,
    sleep_quality: null,
    other_symptoms: null,
    lifestyle_factors: null,
    medication_context: null,
  };
}

export function Journal() {
  const [form, setForm] = useState<JournalEntryInput>(emptyForm());
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const profile = useAsync<UserOut>(() => api.getUser());
  const trends = useAsync<MetricsTrends>(
    () => api.getMetricsTrends(),
    [refreshKey],
  );
  const noDiagnosis = (profile.data?.diagnosis ?? "none") === "none";

  function load() {
    setLoading(true);
    api
      .getJournal()
      .then((data) => {
        setEntries(data);
        setError(null);
      })
      .catch((e: unknown) =>
        setError(e instanceof ApiError ? e.message : "Could not load entries"),
      )
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function setField<K extends keyof JournalEntryInput>(
    key: K,
    value: JournalEntryInput[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.createJournalEntry(form);
      setSaved(true);
      setForm(emptyForm());
      load();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save entry");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Your journal" />

      <section className="card bg-sage-50">
        <p className="text-sm text-charcoal/70">
          Your journal is a private, voluntary space to note how you're feeling —
          symptoms, mood, stress, sleep, cycle, and lifestyle. Over time these
          notes sit alongside your wearable data so patterns can surface in your
          insights. Every field is optional, and a blank field always means “not
          reported,” never a zero or “no symptom.”
        </p>
      </section>

      <section className="card">
        <h2 className="text-base font-semibold text-deepsage-700">
          Today's entry
        </h2>
        <form onSubmit={submit} className="mt-4 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-charcoal/80">Date</label>
              <input
                type="date"
                value={form.date}
                max={today()}
                onChange={(e) => setField("date", e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-deepsage-400 focus:outline-none focus:ring-2 focus:ring-sage-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-charcoal/80">
                Menstrual flow
              </label>
              <select
                value={form.menstrual_flow ?? ""}
                onChange={(e) =>
                  setField("menstrual_flow", e.target.value || null)
                }
                className="mt-1.5 w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-deepsage-400 focus:outline-none focus:ring-2 focus:ring-sage-200"
              >
                <option value="">Not reported</option>
                {FLOW_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-charcoal/80">
                Contraception (today)
              </label>
              <select
                value={form.contraception ?? ""}
                onChange={(e) =>
                  setField("contraception", e.target.value || null)
                }
                className="mt-1.5 w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-deepsage-400 focus:outline-none focus:ring-2 focus:ring-sage-200"
              >
                <option value="">Not reported</option>
                {CONTRACEPTION_DAY_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SCALES.map((s) => (
              <ScaleSelect
                key={s.key}
                label={s.label}
                hint="0–5"
                value={(form[s.key] as number | null) ?? null}
                onChange={(v) => setField(s.key, v)}
              />
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextArea
              label="Other symptoms"
              value={form.other_symptoms ?? ""}
              onChange={(v) => setField("other_symptoms", v || null)}
            />
            <TextArea
              label="Lifestyle factors"
              value={form.lifestyle_factors ?? ""}
              onChange={(v) => setField("lifestyle_factors", v || null)}
            />
            <TextArea
              label="Cycle notes"
              value={form.cycle_notes ?? ""}
              onChange={(v) => setField("cycle_notes", v || null)}
            />
            <TextArea
              label="Medication context (optional)"
              value={form.medication_context ?? ""}
              onChange={(v) => setField("medication_context", v || null)}
            />
          </div>

          {noDiagnosis && (
            <div className="rounded-xl bg-sage-50 p-4 ring-1 ring-sage-200">
              <p className="text-sm font-semibold text-deepsage-700">
                Wearable readings (optional)
              </p>
              <p className="mt-0.5 text-xs text-charcoal/60">
                No wearable connected? Enter today's numbers here and they'll show
                up with your dashboard and insights.
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <NumField
                  label="Recovery (%)"
                  value={form.recovery_score ?? null}
                  onChange={(v) => setField("recovery_score", v)}
                />
                <NumField
                  label="HRV (ms)"
                  value={form.hrv_ms ?? null}
                  onChange={(v) => setField("hrv_ms", v)}
                />
                <NumField
                  label="Resting HR (bpm)"
                  value={form.resting_hr ?? null}
                  onChange={(v) => setField("resting_hr", v)}
                />
                <NumField
                  label="Sleep (minutes)"
                  value={form.sleep_duration_min ?? null}
                  onChange={(v) => setField("sleep_duration_min", v)}
                />
                <NumField
                  label="Sleep efficiency (%)"
                  value={form.sleep_efficiency_pct ?? null}
                  onChange={(v) => setField("sleep_efficiency_pct", v)}
                />
                <NumField
                  label="Strain (0–21)"
                  value={form.strain ?? null}
                  onChange={(v) => setField("strain", v)}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-deepsage-500 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-deepsage-600 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save entry"}
            </button>
            {saved && (
              <span className="text-sm font-medium text-deepsage-600">
                Saved. Your dashboard and insights will reflect it.
              </span>
            )}
            {error && (
              <span className="text-sm font-medium text-rose-400">{error}</span>
            )}
          </div>
        </form>
      </section>

      <section className="card">
        {loading ? (
          <StateBlock kind="loading" />
        ) : (
          <JournalCalendar entries={entries} trends={trends.data} />
        )}
      </section>

      <Disclaimer className="pt-2" />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-charcoal/80">{label}</label>
      <textarea
        value={value}
        rows={2}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full resize-none rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-deepsage-400 focus:outline-none focus:ring-2 focus:ring-sage-200"
      />
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-charcoal/80">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Number(e.target.value))
        }
        className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-deepsage-400 focus:outline-none focus:ring-2 focus:ring-sage-200"
      />
    </div>
  );
}

