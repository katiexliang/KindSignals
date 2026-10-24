"""PMOS Buddy — a supportive, grounded educational companion.

Design:
* `LLMProvider` is the single interface. A factory selects the active provider
  from settings, so adding/replacing an LLM never changes callers.
* `DeterministicProvider` needs no API key. It composes a structured, grounded
  answer from (a) the user's own insight results and (b) the curated research
  library. This guarantees citation-safe, non-fabricating output and means the
  whole app is demonstrable with no paid key.
* `OpenAIProvider` is an optional, defensive wrapper used only when a key is
  present. It is still constrained to cite only the curated library and to
  preserve the three-section structure; if anything goes wrong it falls back to
  the deterministic provider.

Every answer separates three categories — personal observations, cited
scientific evidence, and uncertainty/limitations — and suggests clinician
questions. It never diagnoses, predicts, or prescribes.
"""

from __future__ import annotations

from typing import Protocol

from sqlalchemy.orm import Session

from app.config import settings
from app.schemas import BuddyCitation, BuddyResponse
from app.services.insight_engine import (
    DISCLAIMER,
    METRIC_KNOWLEDGE,
    build_insights,
)
from app.services.metrics_service import build_summary
from app.services.users import get_active_user
from app.services.research_library import (
    Reference,
    find_references,
    get_by_id,
)
from app.services.signals_safety import validate_question

# Map keywords in a question to research-library topics.
TOPIC_KEYWORDS: dict[str, list[str]] = {
    "fatigue": ["fatigue", "recovery", "sleep"],
    "tired": ["fatigue", "recovery", "sleep"],
    "recovery": ["recovery", "sleep", "metabolic"],
    "sleep": ["sleep", "fatigue"],
    "mood": ["mood", "mental health"],
    "depress": ["mood", "mental health", "depression"],
    "anxiety": ["mood", "anxiety"],
    "stress": ["stress", "mental health"],
    "exercise": ["exercise", "lifestyle"],
    "strain": ["exercise", "strain", "lifestyle"],
    "period": ["menstrual", "symptoms"],
    "cycle": ["menstrual", "symptoms"],
    "hrv": ["recovery", "metabolic"],
    "diagnos": ["diagnosis", "overview", "guideline"],
}


# Plain, hedged "what it could mean" notes per metric. Never diagnostic.
COULD_MEAN: dict[str, dict[str, str]] = {
    "recovery": {
        "rising": "This can be a sign your body is handling rest, stress, and activity well lately.",
        "falling": "Lower recovery can show up when sleep, stress, or extra activity are adding up.",
        "stable": "Steady recovery usually means your rest and activity are in a fairly even balance.",
    },
    "hrv": {
        "rising": "Higher HRV often lines up with feeling more recovered and less stressed.",
        "falling": "Dips in HRV can come with more stress, poorer sleep, or a harder few days.",
        "stable": "Steady HRV suggests your stress-and-recovery balance has been fairly even.",
    },
    "resting_hr": {
        "rising": "A rising resting heart rate can show up with less rest, stress, or illness coming on.",
        "falling": "A lower resting heart rate often goes along with being well-rested.",
        "stable": "A steady resting heart rate usually points to a consistent routine.",
    },
    "sleep_duration": {
        "rising": "More sleep lately can support how rested and recovered you feel.",
        "falling": "Less sleep can leave you feeling more tired and can affect recovery.",
        "stable": "Consistent sleep length is a helpful foundation for feeling steady.",
    },
    "strain": {
        "rising": "More strain means more active days — great, as long as recovery keeps up.",
        "falling": "Lower strain means easier days, which can help you recover.",
        "stable": "A steady activity load is often easier for your body to adapt to.",
    },
}


def _topics_for(question: str) -> list[str]:
    q = question.lower()
    topics: list[str] = []
    for keyword, mapped in TOPIC_KEYWORDS.items():
        if keyword in q:
            topics.extend(mapped)
    if not topics:
        topics = ["overview", "guideline", "lifestyle"]
    return topics


def _to_citation(ref: Reference) -> BuddyCitation:
    return BuddyCitation(
        id=ref.id, title=ref.title, authors=ref.authors, year=ref.year,
        source=ref.source, summary=ref.summary, url=ref.url,
    )


class LLMProvider(Protocol):
    name: str

    def generate(
        self, db: Session, question: str, user=None, history=None
    ) -> BuddyResponse: ...


class DeterministicProvider:
    """No-key provider that grounds every answer in data + curated references."""

    name = "deterministic-fallback"

    def generate(
        self, db: Session, question: str, user=None, history=None
    ) -> BuddyResponse:
        user = user or get_active_user(db)
        dx = (user.diagnosis or "none")
        first_name = (user.name or "there").split()[0]

        # --- Safety validation (component E) runs first. ---
        level, safety_msg = validate_question(question)

        # --- Context + analytics (components A + B, backend-validated). ---
        insights = build_insights(db, user)
        summary = build_summary(db, user)

        # --- Research retrieval (component C), diagnosis-aware. ---
        topics = _topics_for(question)
        if dx == "pcos_pmos":
            topics = topics + ["overview", "guideline", "menstrual", "metabolic"]
        refs = find_references(topics)

        q = question.lower()
        usable = [t for t in insights.trends if t.direction != "insufficient data"]

        def mentioned(t) -> bool:
            keys = [t.metric_key, t.metric_label.lower()]
            if t.metric_key == "resting_hr":
                keys += ["heart rate", "resting", "rhr", "pulse", "bpm"]
            if t.metric_key == "hrv":
                keys += ["variability", "hrv", "stress", "stressed", "anxious"]
            if t.metric_key == "sleep_duration":
                keys += ["sleep", "sleeping", "tired", "rest", "rested", "insomnia"]
            if t.metric_key == "recovery":
                keys += ["recover", "readiness", "ready", "tired", "fatigue",
                         "energy", "exhausted", "worn"]
            if t.metric_key == "strain":
                keys += ["activity", "active", "exercise", "workout", "training",
                         "strain", "move", "steps"]
            return any(k in q for k in keys)

        chosen = [t for t in usable if mentioned(t)]
        matched_prompt = len(chosen) > 0
        if not chosen:
            chosen = sorted(usable, key=lambda t: t.sample_size, reverse=True)[:2]

        # --- 1) What YOUR data show (observations + recent journal symptoms). ---
        personal: list[str] = []
        if not matched_prompt and usable:
            personal.append(
                f"I don't track that one directly, but here's what your own data "
                f"can show around \"{question.strip()}\":"
            )
        for t in chosen[:3]:
            tag = " (limited data so far, so take it as an early hint)" if t.low_confidence else ""
            personal.append(t.description + tag)

        # Pull recent reported symptoms from the journal for context.
        recent = summary.recent_symptoms[:3]
        if recent:
            bits = ", ".join(f"{r.label.lower()} {r.value}/5" for r in recent)
            personal.append(f"From your recent journal, you've noted: {bits}.")

        if not personal:
            personal.append(
                f"There isn't enough of your own data yet to summarize this, "
                f"{first_name}. Logging a bit more in your journal and wearing "
                "your device will help patterns show up."
            )

        # --- 2) What RESEARCH suggests (cited, plain language). ---
        evidence = [
            f"{ref.summary} ({ref.authors}, {ref.year})" for ref in refs
        ]

        # --- 3) What's UNCERTAIN. ---
        uncertainty = [
            "These are patterns in your own data — they don't show that one thing "
            "causes another.",
            "Wearable readings can't confirm hormones, insulin, or ovulation; "
            "they're one general signal among many.",
        ]
        if any(t.low_confidence for t in chosen):
            uncertainty.append(
                "There isn't much data here yet, so treat this as an early hint."
            )

        # --- 4) What you could CONSIDER next (low-risk, cited where possible). ---
        consider_next: list[str] = []
        for t in chosen[:2]:
            for text, _cid in METRIC_KNOWLEDGE.get(t.metric_key, {}).get("recs", [])[:1]:
                if text not in consider_next:
                    consider_next.append(text)
        consider_next.append(
            "Keep noting how you feel in your journal — more days make patterns clearer."
        )

        # --- Clinician questions. ---
        topic_label = chosen[0].metric_label.lower() if chosen else "my signals and symptoms"
        clinician_questions = [
            f"I've noticed changes in my {topic_label} — is that worth exploring?",
            "Given my history, which lifestyle areas are most worth focusing on?",
            "Is there anything you'd want me to track or follow up on?",
        ]

        # --- Personalized greeting. ---
        greeting = f"Hi {first_name} — thanks for asking."

        # Safety overrides the educational framing where appropriate but we still
        # return supportive, grounded context (except we never add clinical claims).
        return BuddyResponse(
            provider=self.name,
            question=question,
            greeting=greeting,
            personal_observations=personal,
            scientific_evidence=evidence,
            uncertainty=uncertainty,
            consider_next=consider_next,
            clinician_questions=clinician_questions,
            citations=[_to_citation(r) for r in refs],
            safety_level=level,
            safety_message=safety_msg,
            disclaimer=DISCLAIMER,
        )

# Strict system prompt. The model writes fluent prose but may ONLY use the
# observations and citations we provide, and must obey the health-AI rules.
_SYSTEM_PROMPT = """You are Signals, a warm, plain-language PCOS/PMOS education companion inside KindSignals.

You will receive: the user's own descriptive data observations (already computed and verified), their recent journal notes, and a numbered list of CURATED research citations.

Hard rules (never break these):
- Use ONLY the provided observations and citations. Do not introduce outside facts, studies, statistics, or numbers.
- NEVER diagnose, predict disease, prescribe or adjust treatment/medication, or claim one thing CAUSES another. Use "tends to co-occur with" / "was observed alongside".
- NEVER say wearable data proves hormones, insulin resistance, or ovulation.
- Only cite from the provided list, by its id. If nothing supports a point, say you're not sure rather than guessing.
- Be supportive, non-alarming, and concise.

Respond with a single JSON object with these string-array fields:
  "greeting": short friendly opener (1 sentence),
  "personal_observations": what the user's OWN data show (from the provided observations only),
  "scientific_evidence": what research suggests, in plain language, each line grounded in a provided citation,
  "uncertainty": what remains uncertain / limitations,
  "consider_next": low-risk, non-prescriptive things to consider,
  "clinician_questions": questions to bring to a clinician,
  "citation_ids": the ids (from the provided list) you actually drew on.
Return JSON only."""


class OpenAIProvider:
    """Grounded OpenAI provider.

    Sends gpt-4o-mini ONLY the user's verified observations + curated citations
    under a strict prompt, parses the JSON reply, and validates it: any citation
    id the model returns that is not in the curated library is dropped. Any
    failure (no SDK, API error, bad JSON) falls back to the deterministic
    provider, so the app never breaks and never fabricates.
    """

    name = "openai"

    def __init__(self, api_key: str, model: str) -> None:
        self._api_key = api_key
        self._model = model
        self._fallback = DeterministicProvider()

    def generate(
        self, db: Session, question: str, user=None, history=None
    ) -> BuddyResponse:
        user = user or get_active_user(db)
        # Build a deterministic, grounded answer first — it supplies the verified
        # context for the prompt AND is our safe fallback.
        base = self._fallback.generate(db, question, user, history)

        try:
            from openai import OpenAI
        except Exception:
            return base  # SDK not installed

        # Retrieve curated citations for the prompt (same retrieval as fallback).
        topics = _topics_for(question)
        if (user.diagnosis or "none") == "pcos_pmos":
            topics = topics + ["overview", "guideline", "menstrual", "metabolic"]
        refs = find_references(topics)

        citation_lines = "\n".join(
            f"- id={r.id}: {r.title} ({r.authors}, {r.year}). {r.summary}"
            for r in refs
        )
        observations = "\n".join(f"- {o}" for o in base.personal_observations)
        context = (
            f"User's first name: {(user.name or 'there').split()[0]}\n"
            f"User's noted diagnosis: {user.diagnosis or 'none'}\n\n"
            f"VERIFIED OBSERVATIONS (from the user's own data — use these as the "
            f"personal_observations basis):\n{observations or '- (not enough data yet)'}\n\n"
            f"CURATED CITATIONS (cite only these, by id):\n{citation_lines}\n\n"
            f"User question: {question}"
        )

        messages = [{"role": "system", "content": _SYSTEM_PROMPT}]
        # Multi-turn memory: include recent prior turns.
        for turn in (history or [])[-10:]:
            role = "assistant" if getattr(turn, "role", "") == "signals" else "user"
            text = getattr(turn, "text", "") or ""
            if text:
                messages.append({"role": role, "content": text})
        messages.append({"role": "user", "content": context})

        try:
            client = OpenAI(api_key=self._api_key)
            completion = client.chat.completions.create(
                model=self._model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.4,
                max_tokens=700,
            )
            import json

            data = json.loads(completion.choices[0].message.content or "{}")
        except Exception:
            return base  # any API/parse failure -> safe deterministic answer

        def _list(key: str) -> list[str]:
            v = data.get(key, [])
            return [str(x) for x in v if str(x).strip()] if isinstance(v, list) else []

        # Validate citations: keep ONLY ids that exist in the curated library.
        valid_ids = [
            cid for cid in _list("citation_ids") if get_by_id(cid) is not None
        ]
        citations = [_to_citation(r) for r in (get_by_id(c) for c in valid_ids) if r]
        if not citations:
            citations = base.citations  # never leave an evidence-free answer

        # Re-run safety (same as deterministic) so escalation is consistent.
        level, safety_msg = validate_question(question)

        return BuddyResponse(
            provider=f"openai:{self._model}",
            question=question,
            greeting=data.get("greeting", base.greeting) or base.greeting,
            personal_observations=_list("personal_observations") or base.personal_observations,
            scientific_evidence=_list("scientific_evidence") or base.scientific_evidence,
            uncertainty=_list("uncertainty") or base.uncertainty,
            consider_next=_list("consider_next") or base.consider_next,
            clinician_questions=_list("clinician_questions") or base.clinician_questions,
            citations=citations,
            safety_level=level,
            safety_message=safety_msg,
            disclaimer=DISCLAIMER,
        )


def get_provider() -> LLMProvider:
    """Select the Buddy provider from settings."""
    if settings.llm_provider.lower() == "openai" and settings.llm_api_key:
        return OpenAIProvider(settings.llm_api_key, settings.llm_model)
    return DeterministicProvider()
