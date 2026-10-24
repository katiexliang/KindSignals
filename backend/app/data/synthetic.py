"""Deterministic synthetic demo-data generator for persona Livie.

Everything here is clearly-labeled fake data for demonstration. It is designed
to be:

* **Reproducible** — a fixed RNG seed means every run yields identical data.
* **Realistic-ish** — WHOOP-compatible daily metrics with plausible ranges.
* **Incomplete on purpose** — some days/fields are missing (NULL), so the rest
  of the app can prove it treats missing data as absent, not zero.
* **Pattern-bearing** — a reproducible *descriptive* negative association
  between self-reported fatigue and recovery score is baked in, so the insight
  engine has something real to detect.

THE EMBEDDED PATTERN (documented for transparency):
    For each day we first draw a latent "fatigue level" 0-5. Recovery is then
    generated as `recovery = base_recovery - FATIGUE_RECOVERY_COEF * fatigue +
    noise`. Because recovery is derived partly from fatigue, higher reported
    fatigue tends to co-occur with lower recovery. This is a descriptive
    co-occurrence only — it is NOT a causal claim.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta

import numpy as np

# --- Tunable, documented constants -----------------------------------------

SEED = 42
DAYS = 45

# Latent fatigue → recovery relationship (points of recovery per fatigue unit).
FATIGUE_RECOVERY_COEF = 6.0

# Baselines (means) and standard deviations for daily draws.
RECOVERY_BASE = 68.0
RECOVERY_SD = 8.0
RESTING_HR_BASE = 60.0
RESTING_HR_SD = 4.0
HRV_BASE = 65.0
HRV_SD = 14.0
SLEEP_DURATION_BASE = 430.0  # minutes (~7h10m)
SLEEP_DURATION_SD = 45.0
SLEEP_EFFICIENCY_BASE = 88.0  # percent
SLEEP_EFFICIENCY_SD = 5.0
STRAIN_BASE = 11.0
STRAIN_SD = 3.0

# Probability a given metric is missing on a given day (device gap).
METRIC_MISSING_PROB = 0.12
# Probability an entire journal entry is missing on a given day.
JOURNAL_MISSING_PROB = 0.22
# Probability an individual journal field is missing when an entry exists.
FIELD_MISSING_PROB = 0.18

MENSTRUAL_FLOW_LEVELS = ["none", "spotting", "light", "medium", "heavy"]
LIFESTYLE_SNIPPETS = [
    "long work day",
    "gym session",
    "extra coffee",
    "ate late",
    "walked outdoors",
    "high screen time",
    "social evening",
    "rest day",
]


@dataclass
class DailyMetricData:
    """Plain data record for one day of metrics (adapter-friendly)."""

    date: date
    recovery_score: float | None
    resting_hr: float | None
    hrv_ms: float | None
    sleep_duration_min: float | None
    sleep_efficiency_pct: float | None
    strain: float | None
    source: str = "synthetic"
    is_synthetic: bool = True


@dataclass
class JournalEntryData:
    """Plain data record for one voluntary journal entry."""

    date: date
    menstrual_flow: str | None = None
    cycle_notes: str | None = None
    fatigue: int | None = None
    mood: int | None = None
    stress: int | None = None
    acne: int | None = None
    sleep_quality: int | None = None
    other_symptoms: str | None = None
    lifestyle_factors: str | None = None
    medication_context: str | None = None
    is_synthetic: bool = True


@dataclass
class SyntheticDataset:
    metrics: list[DailyMetricData] = field(default_factory=list)
    journals: list[JournalEntryData] = field(default_factory=list)


def _maybe_missing(rng: np.random.Generator, value: float, prob: float) -> float | None:
    """Return None with probability `prob`, else the rounded value."""
    if rng.random() < prob:
        return None
    return round(float(value), 1)


def generate_dataset(
    end_date: date | None = None,
    days: int = DAYS,
    seed: int = SEED,
) -> SyntheticDataset:
    """Generate `days` consecutive days of synthetic metrics + journal entries.

    The data ends on `end_date` (default: today) and runs backward `days` days.
    Fully deterministic for a given `seed`.
    """
    rng = np.random.default_rng(seed)
    if end_date is None:
        end_date = date.today()
    start_date = end_date - timedelta(days=days - 1)

    dataset = SyntheticDataset()

    # A gentle cycle signal so menstrual observations look plausible (~28 days).
    for i in range(days):
        day = start_date + timedelta(days=i)

        # Latent fatigue (0-5) drives the embedded fatigue<->recovery pattern.
        latent_fatigue = int(np.clip(round(rng.normal(2.3, 1.3)), 0, 5))

        # --- Physiological metrics --------------------------------------
        recovery = (
            RECOVERY_BASE
            - FATIGUE_RECOVERY_COEF * (latent_fatigue - 2.3)
            + rng.normal(0, RECOVERY_SD)
        )
        recovery = float(np.clip(recovery, 1, 100))

        resting_hr = float(np.clip(rng.normal(RESTING_HR_BASE, RESTING_HR_SD), 40, 100))
        hrv = float(np.clip(rng.normal(HRV_BASE, HRV_SD), 10, 200))
        sleep_duration = float(
            np.clip(rng.normal(SLEEP_DURATION_BASE, SLEEP_DURATION_SD), 180, 600)
        )
        sleep_efficiency = float(
            np.clip(rng.normal(SLEEP_EFFICIENCY_BASE, SLEEP_EFFICIENCY_SD), 50, 100)
        )
        strain = float(np.clip(rng.normal(STRAIN_BASE, STRAIN_SD), 0, 21))

        dataset.metrics.append(
            DailyMetricData(
                date=day,
                recovery_score=_maybe_missing(rng, recovery, METRIC_MISSING_PROB),
                resting_hr=_maybe_missing(rng, resting_hr, METRIC_MISSING_PROB),
                hrv_ms=_maybe_missing(rng, hrv, METRIC_MISSING_PROB),
                sleep_duration_min=_maybe_missing(
                    rng, sleep_duration, METRIC_MISSING_PROB
                ),
                sleep_efficiency_pct=_maybe_missing(
                    rng, sleep_efficiency, METRIC_MISSING_PROB
                ),
                strain=_maybe_missing(rng, strain, METRIC_MISSING_PROB),
            )
        )

        # --- Journal entry (voluntary; may be entirely missing) ---------
        if rng.random() < JOURNAL_MISSING_PROB:
            continue  # No entry this day -> absence, not zero.

        cycle_phase = i % 28
        if cycle_phase < 5:
            flow = MENSTRUAL_FLOW_LEVELS[min(4, 1 + cycle_phase // 1 % 4)]
        else:
            flow = "none"

        def field_val(value: int | None) -> int | None:
            if value is None:
                return None
            if rng.random() < FIELD_MISSING_PROB:
                return None
            return int(value)

        # Reported fatigue is the latent fatigue plus small reporting noise.
        reported_fatigue = int(
            np.clip(latent_fatigue + round(rng.normal(0, 0.4)), 0, 5)
        )
        mood = int(np.clip(round(rng.normal(3.2, 1.0)), 0, 5))
        stress = int(np.clip(round(rng.normal(2.6, 1.1)), 0, 5))
        acne = int(np.clip(round(rng.normal(2.0, 1.2)), 0, 5))
        sleep_quality = int(np.clip(round(rng.normal(3.1, 1.0)), 0, 5))

        lifestyle = None
        if rng.random() > 0.5:
            picks = rng.choice(
                LIFESTYLE_SNIPPETS,
                size=int(rng.integers(1, 3)),
                replace=False,
            )
            lifestyle = ", ".join(sorted(picks.tolist()))

        dataset.journals.append(
            JournalEntryData(
                date=day,
                menstrual_flow=field_val_str(rng, flow),
                cycle_notes=None,
                fatigue=field_val(reported_fatigue),
                mood=field_val(mood),
                stress=field_val(stress),
                acne=field_val(acne),
                sleep_quality=field_val(sleep_quality),
                other_symptoms=None,
                lifestyle_factors=lifestyle,
                medication_context=None,
            )
        )

    return dataset


def field_val_str(rng: np.random.Generator, value: str | None) -> str | None:
    """Occasionally drop a string field to simulate a missing observation."""
    if value is None:
        return None
    if rng.random() < FIELD_MISSING_PROB:
        return None
    return value
