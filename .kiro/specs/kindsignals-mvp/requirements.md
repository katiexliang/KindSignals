# KindSignals MVP — Requirements

## Introduction

KindSignals is an AI-powered personal health companion for people living with
Polyendocrine Metabolic Ovarian Syndrome (PMOS). This document defines the
hackathon MVP requirements as user stories with testable acceptance criteria.
The MVP must run fully locally with synthetic data and no paid AI key.

Scope is divided into **MVP (hackathon)** requirements and **Future
Enhancements**. Only MVP requirements are built now.

---

## Requirement 1: Application Shell & Health Check

**User Story:** As a user, I want to open KindSignals and see a branded,
navigable interface that confirms the backend is reachable, so that I trust the
app is working.

### Acceptance Criteria

1. WHEN the frontend loads THEN the system SHALL display the name "KindSignals"
   and the tagline "Understand your signals. Navigate your health."
2. WHEN the frontend loads THEN the system SHALL render a navigation layout with
   entries for Dashboard, Journal, Insights, PMOS Buddy, and Summary.
3. WHEN the backend is running THEN a GET `/api/health` request SHALL return HTTP
   200 with JSON `{ "status": "ok", "service": "KindSignals", ... }`.
4. WHEN the frontend loads THEN it SHALL call `/api/health` and display a visible
   connected/disconnected backend status indicator.
5. WHEN the backend is unreachable THEN the frontend SHALL show a disconnected
   state without crashing.

---

## Requirement 2: Synthetic Demo Data & WHOOP Adapter

**User Story:** As a demo presenter, I want a seeded persona with ~45 days of
realistic, labeled synthetic data, so that every module has something to show
without real credentials.

### Acceptance Criteria

1. WHEN the database is seeded THEN the system SHALL create demo user "Livie",
   age 25, with a recently-diagnosed-PMOS profile.
2. WHEN the database is seeded THEN the system SHALL generate ~45 consecutive
   days of WHOOP-compatible daily metrics (recovery, resting HR, HRV, sleep
   duration, sleep efficiency, strain).
3. WHEN the database is seeded THEN the system SHALL generate matching journal
   entries with intentional missing days/fields.
4. WHEN synthetic data is generated THEN each record SHALL carry a flag marking
   it as synthetic/demo.
5. WHEN data is generated THEN it SHALL use a fixed random seed so results are
   reproducible across runs.
6. WHEN data is generated THEN it SHALL embed at least one reproducible
   descriptive pattern (e.g. lower recovery co-occurring with higher reported
   fatigue).
7. The adapter SHALL expose a source interface such that a real WHOOP API source
   can replace the synthetic source without changing downstream consumers.

---

## Requirement 3: Health Dashboard

**User Story:** As a user, I want a clear dashboard of my recent physiological
signals and trends, so that I can understand my body at a glance.

### Acceptance Criteria

1. WHEN I open the Dashboard THEN the system SHALL display latest recovery score,
   resting heart rate, HRV, sleep duration, sleep efficiency, and daily strain.
2. WHEN I open the Dashboard THEN the system SHALL show trend charts over the
   available time window for key metrics.
3. WHEN metrics are shown THEN the system SHALL display a personal baseline
   (e.g. mean over the period) for context.
4. WHEN I open the Dashboard THEN the system SHALL list recent reported symptoms.
5. WHEN a metric has missing days THEN the chart SHALL represent gaps as missing,
   not as zero.
6. WHEN any value is synthetic THEN the UI SHALL visibly label it as demo data.

---

## Requirement 4: Health Journal

**User Story:** As a user, I want to voluntarily log symptoms and lifestyle
factors, so that I can track how I feel over time.

### Acceptance Criteria

1. WHEN I open the Journal THEN the system SHALL let me record menstrual/cycle
   observations, fatigue, mood, stress, acne, other symptoms, sleep quality,
   lifestyle factors, and optional medication context.
2. WHEN I submit an entry THEN the system SHALL persist it to the database and
   associate it with a date and the demo user.
3. WHEN I leave a field blank THEN the system SHALL store it as missing/null and
   SHALL NOT interpret it as "no symptom" or a default value.
4. WHEN I view the Journal THEN the system SHALL list previous entries with dates.
5. WHEN an entry is created THEN the Dashboard and Insights SHALL reflect it on
   next load.

---

## Requirement 5: Personalized Insights

**User Story:** As a user, I want transparent, descriptive insights about my own
patterns, so that I can learn about myself without being misled.

### Acceptance Criteria

1. WHEN I open Insights THEN the system SHALL compute descriptive longitudinal
   trends for physiological metrics over the available window.
2. WHEN I open Insights THEN the system SHALL compute at least one descriptive
   relationship between a reported symptom and a physiological measurement.
3. WHEN any insight is shown THEN the system SHALL display the sample size (n),
   data coverage/completeness, and the time window used.
4. WHEN any insight is shown THEN the system SHALL include a plain-language
   uncertainty/limitation note.
5. WHEN describing a relationship THEN the system SHALL use descriptive,
   non-causal language and SHALL NOT assert causality or diagnosis.
6. WHEN coverage is low THEN the system SHALL flag the insight as low-confidence.

---

## Requirement 6: PMOS Buddy (Educational AI Companion)

**User Story:** As a user, I want a supportive companion that explains my
observations and points me to real research, so that I can prepare for clinician
conversations.

### Acceptance Criteria

1. WHEN I ask PMOS Buddy a question THEN the system SHALL respond with an
   educational, supportive, plain-language answer.
2. WHEN no LLM API key is configured THEN the system SHALL use a deterministic
   fallback that still produces a coherent, grounded answer.
3. WHEN an LLM key is configured THEN the system SHALL route through a modular
   provider interface without code changes elsewhere.
4. WHEN Buddy references science THEN it SHALL cite entries from the curated
   research library and SHALL NOT fabricate references.
5. WHEN Buddy answers THEN it SHALL clearly separate personal observations,
   scientific evidence, and uncertainty/limitations.
6. WHEN Buddy answers THEN it SHALL suggest low-risk educational considerations
   and questions for a clinician, never diagnoses or treatment instructions.

---

## Requirement 7: Clinician-Ready Health Summary (PDF)

**User Story:** As a user, I want a one-page PDF I can bring to my doctor, so
that our visit is more productive.

### Acceptance Criteria

1. WHEN I request a summary THEN the system SHALL generate a one-page PDF via
   ReportLab and return it as a download.
2. WHEN the PDF is generated THEN it SHALL include: patient info, observation
   period, menstrual/symptom history, wearable measurements, verified trends,
   relevant context, data limitations, patient concerns, and suggested clinician
   discussion questions.
3. WHEN the PDF is generated THEN it SHALL be labeled "patient-generated
   information, not a medical assessment."
4. WHEN the PDF contains synthetic data THEN it SHALL be labeled as demo data.
5. WHEN generation fails THEN the system SHALL return a clear error, not a
   corrupt file.

---

## Requirement 8: Responsible-AI Guardrails (Cross-Cutting)

**User Story:** As a user with a health condition, I want the app to be honest
and safe, so that I am never misled.

### Acceptance Criteria

1. The system SHALL NOT diagnose, predict severity, or prescribe treatment in any
   module.
2. The system SHALL NOT assert causal claims in insights or Buddy output.
3. The system SHALL NOT present invented citations; all citations trace to the
   curated library.
4. The system SHALL treat missing data as absent, excluded from denominators.
5. The system SHALL label all synthetic data wherever it is displayed or exported.

---

## Future Enhancements (Out of MVP Scope)

- Live WHOOP OAuth and real-time data sync.
- Production authentication and multi-user accounts.
- FHIR / EHR integration.
- Predictive ML models and forecasting.
- Cloud deployment and persistence beyond local SQLite.
- Push notifications and reminders.
