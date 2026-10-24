---
inclusion: always
---

# KindSignals — Product Context

**KindSignals** is an AI-powered personal health companion for individuals living
with **Polyendocrine Metabolic Ovarian Syndrome (PMOS)**, formerly known as PCOS.

**Tagline:** _Understand your signals. Navigate your health._

Built for **Hackachusetts 2026**, sponsored by **WHOOP**, under the challenge
_"Turning Wearable Data into Better Healthcare."_

## Product Vision

KindSignals combines five pillars:

1. WHOOP-compatible physiological data.
2. Voluntary personal health journals.
3. A curated library of peer-reviewed PMOS research.
4. An AI educational companion called **PMOS Buddy**.
5. A downloadable one-page **Clinician-Ready Health Summary** (PDF).

The user journey follows a repeatable loop:

**Track → Understand → Learn → Act → Reflect**

The goal is to help users recognize personal health patterns, understand relevant
scientific evidence, and prepare for informed healthcare conversations.

## The Five MVP Modules

- **A. Health Dashboard** — recovery, resting heart rate, HRV, sleep
  (duration + efficiency), daily strain, trends over time, recent symptoms.
- **B. Health Journal** — voluntary logging of menstrual/cycle observations,
  fatigue, mood, stress, acne and other symptoms, sleep quality, lifestyle
  factors, optional medication context.
- **C. Personalized Insights** — longitudinal trends and descriptive
  relationships between symptoms and physiology, with transparent math.
- **D. PMOS Buddy** — supportive AI companion that explains observations,
  cites curated research, distinguishes evidence from personal data, and
  surfaces questions for clinicians.
- **E. Clinician-Ready Health Summary** — one-page patient-generated PDF.

## Demo Persona

**Livie**, age 25, recently diagnosed with PMOS. The demo ships with ~45 days of
clearly-labeled synthetic WHOOP-compatible data and matching journal entries,
including intentional gaps. The data is designed so at least one descriptive
pattern is detectable with reproducible calculations.

Demo flow: Livie opens KindSignals → views dashboard → completes a journal entry
→ discovers a personal pattern → asks PMOS Buddy → reviews cited guidance →
generates her clinician-ready PDF. Everything works without real WHOOP
credentials or a paid AI key.

## Scope Boundaries (Hackathon MVP)

**In scope:** synthetic WHOOP adapter, local SQLite, the five modules above,
deterministic insight engine, LLM-optional Buddy, PDF export, a seeded demo user.

**Out of scope (future enhancements):** live WHOOP OAuth, production auth, FHIR
integration, advanced ML/forecasting, multi-user accounts, cloud deployment.
