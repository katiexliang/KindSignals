---
inclusion: always
---

# KindSignals — Technical Conventions

## Stack

**Frontend**
- React + TypeScript
- Vite (dev server + build)
- Tailwind CSS
- Responsive, mobile-first design
- Charting via a lightweight library (Recharts)

**Backend**
- Python 3.11+ / FastAPI / Pydantic (v2)
- pandas + NumPy for analysis
- SQLite via SQLAlchemy
- ReportLab for PDF generation
- Uvicorn as the ASGI server

**AI**
- Modular LLM provider architecture behind a single interface.
- A **deterministic explanation fallback** that runs when no LLM API key is set.
  The app must be fully demonstrable with the fallback only.
- Curated, verified research references only. Never fabricate citations.

**Wearable integration**
- A WHOOP-compatible data **adapter** abstraction.
- Phase 1 feeds synthetic data through the adapter.
- The interface must allow a real authenticated WHOOP API source to be dropped
  in later without changing downstream code.

## Repository Layout

```
KindSignals/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app + router registration
│   │   ├── config.py          # settings (env-driven, no secrets in code)
│   │   ├── database.py        # SQLAlchemy engine/session
│   │   ├── models.py          # ORM models
│   │   ├── schemas.py         # Pydantic schemas
│   │   ├── routers/           # one module per feature area
│   │   ├── services/          # adapters, insight engine, buddy, pdf
│   │   └── data/              # synthetic data generation + seed
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── lib/               # api client, types, formatting
│   │   └── main.tsx / App.tsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── .kiro/
└── README.md
```

## Conventions

- **API prefix:** all backend routes live under `/api`. Health check at `/api/health`.
- **CORS:** backend allows the Vite dev origin (`http://localhost:5173`).
- **Env/secrets:** read config from environment. Provide `.env.example`, never
  commit real secrets. No API keys in source.
- **Ports:** backend `8000`, frontend `5173`. Frontend reads the API base URL
  from `VITE_API_BASE_URL` (default `http://localhost:8000`).
- **Typing:** strict TypeScript on the frontend; type hints + Pydantic models on
  the backend.
- **Determinism:** synthetic data generation is seeded so demos are reproducible.
- **Labeling:** every simulated measurement/observation is explicitly flagged as
  synthetic in the data model and surfaced in the UI.
- **Testing:** pytest for backend. Keep functions small and testable. Do not add
  tests unless they support a feature being built or are explicitly requested.

## Run Commands

Backend:
```
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend:
```
cd frontend
npm install
npm run dev
```
