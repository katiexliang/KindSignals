"""Safety validation for Signals (component E).

Scans a user's question for categories that need special handling and returns a
(level, message) pair. Signals never diagnoses, prescribes, predicts severity,
or interprets wearable data as proof of a hormonal/ovulation/insulin state.

Levels:
  * "urgent"        — possible emergency; direct to urgent care / emergency help.
  * "mental_health" — distress/self-harm language; direct to crisis support.
  * "clinical"      — asking for diagnosis/medication/treatment change; decline
                      and redirect to a clinician, but still offer education.
  * "ok"            — normal educational question.

The message text is fixed, supportive scaffolding — not medical advice.
"""

from __future__ import annotations

# Keywords are intentionally broad; false positives fail safe (toward caution).
_URGENT = [
    "chest pain", "can't breathe", "cannot breathe", "trouble breathing",
    "severe bleeding", "heavy bleeding won't stop", "faint", "fainting",
    "passed out", "suicidal emergency", "overdose", "numbness on one side",
    "slurred speech", "severe abdominal pain", "911",
]
_MENTAL_HEALTH = [
    "suicide", "suicidal", "kill myself", "end my life", "self harm",
    "self-harm", "hurt myself", "don't want to live", "hopeless and",
]
_CLINICAL = [
    "diagnose", "do i have", "should i take", "what medication", "what medicine",
    "prescribe", "stop taking", "change my dose", "increase my dose",
    "am i insulin resistant", "do i have insulin resistance", "when will i ovulate",
    "am i ovulating", "am i pregnant",
]

_URGENT_MSG = (
    "Some of what you described can need prompt medical attention. If this is an "
    "emergency, please contact your local emergency number right away. If you're "
    "unsure, contacting a clinician or urgent care soon is a good step."
)
_MENTAL_HEALTH_MSG = (
    "It sounds like you may be going through a really hard time, and you deserve "
    "support. If you might be in crisis, please reach out to a local crisis line "
    "or emergency services. In the US you can call or text 988 (Suicide & Crisis "
    "Lifeline). You don't have to navigate this alone."
)
_CLINICAL_MSG = (
    "That's an important question for a healthcare professional — I can't "
    "diagnose, prescribe, or tell you to change a treatment. I can share what "
    "your own data show and what research says in general, so you can have a "
    "well-prepared conversation with your care team."
)


def validate_question(question: str) -> tuple[str, str]:
    """Return (level, message). `message` is empty when level == "ok"."""
    q = question.lower()
    if any(k in q for k in _URGENT):
        return "urgent", _URGENT_MSG
    if any(k in q for k in _MENTAL_HEALTH):
        return "mental_health", _MENTAL_HEALTH_MSG
    if any(k in q for k in _CLINICAL):
        return "clinical", _CLINICAL_MSG
    return "ok", ""
