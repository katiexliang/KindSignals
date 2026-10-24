import { PageHeader } from "../components/PageHeader";
import { Disclaimer } from "../components/Disclaimer";
import { useState } from "react";
import { api, ApiError } from "../lib/api";

const SECTIONS = [
  "Patient information & observation period",
  "Wearable measurements with personal baselines",
  "Observed trends (descriptive)",
  "Observed symptom–signal relationships (non-causal)",
  "Menstrual & symptom history",
  "Data limitations",
  "Suggested questions for your clinician",
];

export function Summary() {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    setErr(null);
    try {
      await api.downloadSummaryPdf();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not download PDF");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Health summary"
        subtitle="A one-page PDF you can bring to an appointment. It's labeled patient-generated information — not a medical assessment — and includes a plain data-limitations section."
        actions={
          <button
            type="button"
            onClick={download}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-deepsage-700 shadow-soft transition hover:bg-sage-50 disabled:opacity-60"
          >
            {busy ? "Preparing…" : "Download PDF"}
          </button>
        }
      />
      {err && <p className="px-1 text-sm text-rose-400">{err}</p>}

      <section className="card">
        <h2 className="text-sm font-semibold text-deepsage-700">
          What’s included
        </h2>
        <ul className="mt-3 space-y-2">
          {SECTIONS.map((s) => (
            <li
              key={s}
              className="flex items-center gap-3 rounded-xl bg-sage-50 px-3 py-2 text-sm text-charcoal/80"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-deepsage-400" />
              {s}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-charcoal/40">
          The summary reflects your current data, including any journal entries
          you’ve added. Generate it again after updating your journal to refresh
          the content.
        </p>
      </section>

      <Disclaimer className="pt-2" />
    </div>
  );
}
