# KindSignals MVP — Implementation Plan

Tasks are ordered by dependency. Each references the requirements it satisfies.
"Depends on" notes gate the order. Checkboxes track progress.

- [x] 1. Project structure & dependency setup
  - Create `backend/` and `frontend/` trees per tech steering.
  - Backend `requirements.txt`, `.env.example`, venv.
  - Frontend Vite + React + TS + Tailwind + Recharts + react-router-dom.
  - Root `README.md` with run instructions and `.gitignore`.
  - _Requirements: 1_
  - _Depends on: none_

- [x] 2. Backend core: app shell + health check
  - `config.py`, `database.py`, `main.py` with CORS + `/api` router mount.
  - `routers/health.py` → `GET /api/health`.
  - _Requirements: 1.3_
  - _Depends on: 1_

- [x] 3. Frontend shell: branding, nav, backend status
  - `App.tsx` layout, routing, NavBar with 5 destinations.
  - Landing shows "KindSignals" + tagline.
  - `lib/api.ts`, `BackendStatus` calling `/api/health`.
  - Tailwind design-system base (colors, cards, DemoBadge).
  - _Requirements: 1.1, 1.2, 1.4, 1.5_
  - _Depends on: 1, 2_
  - **MILESTONE: end-to-end "hello" demo runs (first-task success criterion).**

- [x] 4. Data models + synthetic generator + seed
  - `models.py`, `schemas.py`.
  - `data/synthetic.py` (seeded, 45 days, gaps, embedded fatigue↔recovery
    pattern, synthetic flags).
  - `data/seed.py` CLI to create + seed the DB with persona Livie.
  - _Requirements: 2.1–2.7, 8.4, 8.5_
  - _Depends on: 2_

- [x] 5. WHOOP adapter abstraction
  - `services/whoop_adapter.py` with `WhoopDataSource` protocol,
    `SyntheticWhoopSource`, and a `WhoopApiSource` stub.
  - _Requirements: 2.7_
  - _Depends on: 4_

- [x] 6. Metrics API + Health Dashboard
  - `routers/metrics.py`: summary + trends (gaps as null).
  - Dashboard page: metric cards, baselines, trend charts, recent symptoms,
    demo labels.
  - _Requirements: 3.1–3.6_
  - _Depends on: 4, 5, 3_

- [x] 7. Journal API + Health Journal UI
  - `routers/journal.py`: GET list, POST create (nulls preserved).
  - Journal page: voluntary form + entry history.
  - _Requirements: 4.1–4.5, 8.4_
  - _Depends on: 4, 3_

- [x] 8. Insight engine + Insights API + Insights UI
  - `services/insight_engine.py`: trends + association, descriptive/non-causal,
    with n, coverage, window, uncertainty, low-confidence flag.
  - `routers/insights.py`.
  - Insights page rendering transparent results.
  - _Requirements: 5.1–5.6, 8.2, 8.4_
  - _Depends on: 4, 5_

- [x] 9. Research library + PMOS Buddy
  - `services/research_library.py` (curated, real, cited references).
  - `services/buddy.py`: `LLMProvider` protocol, `DeterministicProvider`
    fallback, optional `OpenAIProvider`, factory from settings.
  - `routers/buddy.py` → `POST /api/buddy/ask`.
  - Buddy page: chat UI with three labeled sections + clinician questions.
  - _Requirements: 6.1–6.6, 8.1, 8.2, 8.3_
  - _Depends on: 8_

- [x] 10. Clinician-ready PDF
  - `services/pdf_service.py` (ReportLab one-pager, all required sections,
    patient-generated + synthetic labels).
  - `routers/summary.py` → `GET /api/summary/pdf` download.
  - Summary page: preview of sections + download button.
  - _Requirements: 7.1–7.5, 8.5_
  - _Depends on: 8_

- [x] 11. Backend tests
  - pytest: health endpoint, synthetic seed reproducibility + embedded pattern,
    insight engine determinism / missing-data / non-causal wording.
  - _Requirements: 2.5, 2.6, 5.x, 8.2, 8.4_
  - _Depends on: 4, 8_

- [x] 12. End-to-end demo preparation
  - Verify full Livie flow: dashboard → journal → insight → Buddy → PDF.
  - README demo script. Confirm runs with no LLM key.
  - _Requirements: all_
  - _Depends on: 6, 7, 8, 9, 10_

---

## Dependency Summary

```
1 ─▶ 2 ─▶ 3  (milestone)
      └▶ 4 ─▶ 5 ─▶ 6
            ├────────▶ 7
            └▶ 8 ─▶ 9
                 └▶ 10
      4,8 ─▶ 11
6,7,8,9,10 ─▶ 12
```

## MVP vs Future
MVP = tasks 1–12. Future (not in this plan): WHOOP OAuth, production auth,
FHIR, predictive ML, cloud deploy, notifications.
