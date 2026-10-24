# KindSignals

**Understand your signals. Navigate your health.**

An AI-powered personal health companion for people living with Polyendocrine
Metabolic Ovarian Syndrome (PMOS). Built for Hackachusetts 2026 (WHOOP
challenge: _Turning Wearable Data into Better Healthcare_).

> KindSignals is an educational companion. It does **not** diagnose, predict
> disease, or prescribe treatment, and it does not replace a clinician. All demo
> data is **synthetic**.

## Project Layout

```
KindSignals/
├── backend/    FastAPI + SQLite + pandas/ReportLab (Python)
├── frontend/   React + TypeScript + Vite + Tailwind
└── .kiro/      Steering + MVP spec (requirements, design, tasks)
```

## Prerequisites

- Python 3.11+ (tested on 3.13)
- Node.js 18+ (tested on 24)

## Run the Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

- API: http://localhost:8000
- Interactive docs: http://localhost:8000/docs
- Health check: http://localhost:8000/api/health

## Run the Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

- App: http://localhost:5173

The frontend reads the API base URL from `VITE_API_BASE_URL` (default
`http://localhost:8000`). Copy `frontend/.env.example` to `frontend/.env` to
override.

## Verify It Works

1. Start the backend, then the frontend.
2. Open http://localhost:5173.
3. You should see the KindSignals name, tagline, navigation, and a green
   **"Backend connected"** indicator in the top bar.

## Configuration

Backend config is environment-driven — copy `backend/.env.example` to
`backend/.env`. No secrets are committed. PMOS Buddy runs on a deterministic,
no-key fallback by default (`LLM_PROVIDER=fallback`).

## Features (MVP complete)

- **Health Dashboard** — recovery, resting HR, HRV, sleep (duration + efficiency),
  strain, with personal baselines, coverage %, trend charts (gaps shown as
  breaks, never zero), and recent reported symptoms.
- **Health Journal** — voluntary logging of menstrual/cycle observations,
  fatigue, mood, stress, acne, sleep quality, lifestyle, and medication context.
  Blank fields are stored as "not reported," never as zero.
- **Personalized Insights** — descriptive longitudinal trends and symptom↔signal
  relationships with sample size, coverage, time window, and uncertainty notes.
  Non-causal language throughout.
- **PMOS Buddy** — an educational companion that separates your personal
  observations, cited scientific evidence (from a curated library), and
  uncertainty, and suggests questions for your clinician. Runs on a deterministic
  no-key fallback; a modular provider interface allows an LLM to be added.
- **Clinician-Ready Summary** — a one-page PDF (ReportLab) labeled
  patient-generated information, with a data-limitations section.

## Demo Script (persona: Livie, 25, recently diagnosed with PMOS)

1. **Seed** the demo data (once): `python -m app.data.seed` in `backend/`.
2. Start the backend and frontend (see above), open http://localhost:5173.
3. **Dashboard** — Livie sees her signals: ~45 days of synthetic WHOOP data with
   baselines and trends. Note the "Synthetic demo data" badge.
4. **Journal** — add a new entry (e.g. high fatigue, medium flow). Leave some
   fields blank to show they stay "not reported."
5. **Insights** — discover the pattern: higher **fatigue** tends to co-occur with
   **lower recovery** (r ≈ −0.39, n ≈ 29), shown with coverage and an explicit
   "not cause and effect" note.
6. **PMOS Buddy** — ask "Why do I feel tired and how is my recovery?" Buddy
   returns the personal observation, cited research (real references), and
   clinician questions.
7. **Summary** — download the one-page clinician-ready PDF.

Everything runs locally with no WHOOP credentials and no paid AI key.

## Testing

Backend tests (pytest):

```bash
cd backend && source .venv/bin/activate && python -m pytest
```

Covers the health endpoint, synthetic-data reproducibility and the embedded
pattern, insight-engine determinism / missing-data handling / non-causal
wording, and the journal, Buddy, and PDF endpoints.

## Status

All MVP tasks (1–12) are complete and verified. See
`.kiro/specs/kindsignals-mvp/tasks.md`. Out of scope for this MVP (future work):
live WHOOP OAuth, production auth, FHIR integration, predictive ML, and cloud
deployment.
