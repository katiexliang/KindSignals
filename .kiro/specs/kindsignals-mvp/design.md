# KindSignals MVP — Design

## Overview

KindSignals is a two-tier local application: a FastAPI/SQLite backend serving a
JSON API under `/api`, and a React/TypeScript/Vite SPA. All data is synthetic
and seeded. The backend is organized around a **data-source adapter** so a real
WHOOP connection can be added later, a **deterministic insight engine**, a
**modular LLM provider** for PMOS Buddy with a non-LLM fallback, and a
**ReportLab PDF** exporter.

```
┌─────────────── Frontend (Vite / React / TS / Tailwind) ──────────────┐
│  Pages: Dashboard · Journal · Insights · PMOS Buddy · Summary        │
│  lib/api.ts  ──HTTP──▶                                               │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ /api/*
┌──────────────────────────────▼──────────────────────────────────────┐
│                         FastAPI  (app/main.py)                        │
│  routers: health · metrics · journal · insights · buddy · summary    │
│  services:                                                            │
│    whoop_adapter (SyntheticSource ▸ WhoopSource later)               │
│    insight_engine (pandas/numpy, descriptive only)                   │
│    buddy (LLMProvider interface + DeterministicProvider fallback)    │
│    research_library (curated, cited)                                 │
│    pdf_service (ReportLab)                                           │
│  models/schemas · database (SQLAlchemy + SQLite)                     │
└───────────────────────────────────────────────────────────────────┘
```

## Backend Design

### Configuration (`app/config.py`)
Pydantic `Settings` read from environment. Keys: `LLM_PROVIDER` (default
`fallback`), `LLM_API_KEY` (optional), `DATABASE_URL` (default
`sqlite:///./kindsignals.db`), `CORS_ORIGINS`. No secrets in source;
`.env.example` documents the keys.

### Data Model (`app/models.py`)

- **User**: `id`, `name`, `age`, `diagnosis`, `diagnosed_on`, `is_demo`.
- **DailyMetric**: `id`, `user_id`, `date`, `recovery_score`, `resting_hr`,
  `hrv_ms`, `sleep_duration_min`, `sleep_efficiency_pct`, `strain`,
  `source` (e.g. `synthetic`), `is_synthetic` (bool). Nullable metric columns so
  gaps are real nulls.
- **JournalEntry**: `id`, `user_id`, `date`, `menstrual_flow`,
  `cycle_notes`, `fatigue` (0–5), `mood` (0–5), `stress` (0–5),
  `acne` (0–5), `other_symptoms` (text), `sleep_quality` (0–5),
  `lifestyle_factors` (text), `medication_context` (text), `is_synthetic`.
  All symptom fields nullable → missing is distinct from zero.

### Schemas (`app/schemas.py`)
Pydantic v2 models mirroring the ORM for request/response, plus derived response
types: `MetricSummary`, `TrendSeries`, `InsightResult`, `BuddyResponse`,
`SummaryRequest`.

### WHOOP Adapter (`app/services/whoop_adapter.py`)
```python
class WhoopDataSource(Protocol):
    def get_daily_metrics(self, user_id: int) -> list[DailyMetricData]: ...

class SyntheticWhoopSource:   # reads seeded DB rows, labeled synthetic
class WhoopApiSource:         # future: real OAuth-backed source (stub)
```
Downstream code depends only on `WhoopDataSource`. Phase 1 wires
`SyntheticWhoopSource`.

### Synthetic Data Generator (`app/data/synthetic.py`)
- Fixed seed (`numpy.random.default_rng(42)`).
- 45 consecutive days ending "today".
- Baselines with daily noise: recovery ~ N(65,12) clipped 1–100; resting HR
  ~ N(60,4); HRV ~ N(65,15); sleep duration ~ N(430,45) min; sleep efficiency
  ~ N(88,5)%; strain ~ N(11,3).
- **Embedded pattern:** on days with higher reported `fatigue`, recovery is
  shifted downward (and vice versa) so a reproducible negative association
  between fatigue and recovery is detectable. Documented in the insight engine.
- Intentional gaps: ~15% of days missing a metric; ~25% of days missing journal
  entry or individual fields.
- Every row flagged `is_synthetic=True`, `source="synthetic"`.

### Insight Engine (`app/services/insight_engine.py`)
Pure, descriptive, reproducible functions over pandas DataFrames:
- `trend(series)` → slope via least-squares + mean baseline + n + coverage.
- `association(symptom, metric)` → Pearson r on paired non-null days, with n,
  coverage, window, and a plain-language, **non-causal** interpretation band
  ("weak/moderate/strong co-occurrence"). Low n or coverage ⇒ low-confidence
  flag. Missing values dropped pairwise (never zero-filled).
Each result carries `sample_size`, `coverage_pct`, `window`, `uncertainty_note`.

### PMOS Buddy (`app/services/buddy.py`)
```python
class LLMProvider(Protocol):
    def generate(self, prompt: str, context: BuddyContext) -> str: ...

class DeterministicProvider:  # template-based, cites research_library, no key
class OpenAIProvider:         # optional; used only if LLM_API_KEY present
```
A factory picks the provider from settings. The Buddy response always returns a
structured object with three labeled sections (personal observations · cited
evidence · uncertainty) plus suggested clinician questions. The deterministic
provider composes these from the insight engine + research library, guaranteeing
grounded, citation-safe output with no key.

### Research Library (`app/services/research_library.py`)
A small, hand-curated, in-code list of real, verifiable PMOS/PCOS references
(title, authors, year, journal/source, summary, URL/DOI). Buddy may only cite
from this list. No network fetch, no generation of new references.

### PDF Service (`app/services/pdf_service.py`)
ReportLab builds a single-page document: header (patient-generated banner),
patient info, observation period, menstrual/symptom history, wearable
measurements, verified trends, context, **data limitations**, patient concerns,
clinician questions, synthetic-data label. Returns bytes streamed as a download.

### Routers (`app/routers/`)
- `health.py` → `GET /api/health`.
- `metrics.py` → `GET /api/metrics/summary`, `GET /api/metrics/trends`.
- `journal.py` → `GET/POST /api/journal`.
- `insights.py` → `GET /api/insights`.
- `buddy.py` → `POST /api/buddy/ask`.
- `summary.py` → `GET /api/summary/pdf`.
All under the `/api` prefix. CORS allows `http://localhost:5173`.

## Frontend Design

### Structure
- `lib/api.ts` — typed fetch client, base URL from `VITE_API_BASE_URL`.
- `lib/types.ts` — shared TS types mirroring backend schemas.
- `components/` — `NavBar`, `BackendStatus`, `MetricCard`, `TrendChart`
  (Recharts), `SymptomList`, `DemoBadge`, `SectionCard`.
- `pages/` — `Dashboard`, `Journal`, `Insights`, `Buddy`, `Summary`.
- `App.tsx` — layout + client-side routing (react-router-dom).

### Design System (Tailwind)
- Palette: soft calming tones — primary teal/aqua, lavender accents, warm
  neutral background, gentle status colors. Accessible contrast (WCAG AA target).
- Rounded-2xl cards, soft shadows, generous spacing, clean sans-serif.
- Mobile-first; nav collapses on small screens.
- A persistent `DemoBadge` indicating synthetic data.

### Backend Status
On mount, `BackendStatus` calls `/api/health`; shows connected (green) or
disconnected (amber) without crashing on failure.

## Error Handling
- Backend returns structured JSON errors; PDF/Buddy failures return clear
  messages, never partial/corrupt output.
- Frontend degrades gracefully: missing data renders as "—" or gap, not zero.

## Testing Strategy
- Backend: pytest for the insight engine (determinism, missing-data handling,
  non-causal output), the synthetic generator (seed reproducibility + embedded
  pattern), and `/api/health`.
- Build-time verification: backend import + `/api/health` curl; frontend
  `npm run build` / dev server boot.
- Tests are added alongside the feature they cover, not up front.

## Phasing / Dependencies
Scaffold + health check must exist before feature routers. Synthetic data +
models precede metrics/journal/insights. Insight engine precedes Buddy and PDF
(both consume it). Research library precedes Buddy citations.
