---
inclusion: always
---

# KindSignals — Responsible Health AI Requirements

These rules are non-negotiable and apply to all code, content, AI output,
generated documents, and UI copy.

## Hard Prohibitions

KindSignals must **never**:

- Diagnose a condition.
- Predict disease onset, progression, or severity.
- Prescribe, recommend, or adjust treatments or medications.
- Claim causality between two variables.
- Replace or impersonate a healthcare professional.
- Fabricate medical evidence, studies, statistics, or citations.

## Evidence Integrity

- Every scientific claim must trace to an entry in the **curated research
  library**. No citation may be invented or paraphrased into a stronger claim
  than its source supports.
- PMOS Buddy and any LLM output must clearly separate three categories:
  1. **Your personal observations** (user's own data).
  2. **Scientific evidence** (curated, cited references).
  3. **Uncertainty / limitations** (what the data cannot tell us).
- If the model is unsure or lacks a citation, it says so rather than guessing.

## Transparency of Analysis

- Insights are **descriptive**, not causal. Use language like "tends to
  co-occur with" / "was observed alongside," never "causes" or "leads to."
- Always surface: sample size (n), data coverage / completeness, the time
  window analyzed, and a plain-language uncertainty note.
- Calculations must be reproducible and transparent (documented formulas).

## Voluntary Data & Missing Values

- All journal entries are voluntary.
- A missing response must **never** be interpreted as "no symptom" or a normal
  value. Absent data is treated as absent, excluded from denominators, and
  reported as reduced coverage.

## Synthetic Data Labeling

- All demo data is synthetic and must be explicitly flagged in the data model
  and visibly labeled in the UI and in any exported PDF.
- Simulated features must remain clearly distinguishable from real integrations
  (e.g. the WHOOP source is labeled "Synthetic (demo)" until a real connection
  exists).

## Clinician-Ready PDF

- Must be labeled **patient-generated information, not a medical assessment**.
- Includes an explicit data-limitations section.
- Frames clinician questions as questions to ask, not conclusions.

## Tone

Supportive, plain-language, and non-alarming. Educational, not authoritative.
Empower the user to have informed conversations with their care team.
