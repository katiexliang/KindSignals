"""Descriptive, reproducible insight engine.

Everything here is **descriptive**, never causal or diagnostic:

* Trends report the direction and rate of change of a metric over the available
  window via an ordinary least-squares slope.
* Associations report the Pearson correlation between a reported symptom and a
  physiological metric, computed only on days where BOTH are present (pairwise
  deletion). Missing values are never zero-filled and never counted.

Every result carries sample size (n), coverage, the time window, and a
plain-language uncertainty note. Low n or low coverage flags the result as
low-confidence. Language is strictly non-causal ("tends to co-occur with",
never "causes").
"""

from __future__ import annotations

from datetime import date, timedelta

import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.data.synthetic import DailyMetricData
from app.models import JournalEntry
from app.schemas import (
    AssociationInsight,
    BuddyCitation,
    DayInsight,
    DayInsightsResponse,
    InsightRecommendation,
    InsightsResponse,
    SignalConnection,
    SignalsSummary,
    TrendInsight,
)
from app.services.research_library import find_references, get_by_id
from app.services.users import get_active_user
from app.services.whoop_adapter import get_default_source

DISCLAIMER = (
    "These are descriptive observations of your own data over time. They do not "
    "establish cause and effect, do not diagnose any condition, and are not "
    "medical advice. Discuss anything that concerns you with your care team."
)

# Minimum paired days before we trust an association / a coverage floor.
MIN_SAMPLE = 10
MIN_COVERAGE_PCT = 50.0

# Metrics we compute trends for: (DailyMetricData attr, key, label, unit)
TREND_METRICS: list[tuple[str, str, str, str | None]] = [
    ("recovery_score", "recovery", "Recovery", "%"),
    ("hrv_ms", "hrv", "HRV", "ms"),
    ("resting_hr", "resting_hr", "Resting HR", "bpm"),
    ("sleep_duration_min", "sleep_duration", "Sleep duration", "min"),
    ("strain", "strain", "Strain", None),
]

# Symptom/metric pairs to examine: (symptom attr, symptom label, metric attr,
# metric key, metric label)
ASSOCIATION_PAIRS: list[tuple[str, str, str, str, str]] = [
    ("fatigue", "Fatigue", "recovery_score", "recovery", "Recovery"),
    ("stress", "Stress", "hrv_ms", "hrv", "HRV"),
    ("sleep_quality", "Sleep quality", "sleep_efficiency_pct", "sleep_efficiency", "Sleep efficiency"),
]


# Per-metric descriptive knowledge. "measures" explains the metric; "relevance"
# frames why it matters for PCOS/PMOS management (and generally); each
# recommendation is a general, non-prescriptive suggestion traceable to a
# curated reference id. Nothing here diagnoses, prescribes, or claims causation.
METRIC_KNOWLEDGE: dict[str, dict] = {
    "recovery": {
        "measures": (
            "Recovery is a daily readiness score (0–100%) that summarizes how "
            "rested and ready your body appears, based largely on heart-rate "
            "variability, resting heart rate, and sleep."
        ),
        "relevance_pcos": (
            "For people managing PCOS/PMOS, day-to-day recovery can reflect how "
            "sleep, stress, and activity are balancing out — factors commonly "
            "discussed in PCOS self-management."
        ),
        "relevance_general": (
            "Recovery gives a general sense of how rested you are day to day."
        ),
        "recs": [
            ("Keeping a consistent sleep schedule supports recovery.", "fernandez2018"),
            ("Regular physical activity is a commonly recommended lifestyle factor.", "patten2020"),
        ],
    },
    "hrv": {
        "measures": (
            "Heart-rate variability (HRV, in milliseconds) is the variation "
            "between heartbeats. Higher HRV generally reflects a more recovered, "
            "less stressed state."
        ),
        "relevance_pcos": (
            "HRV is a general marker of stress and recovery balance, which is "
            "relevant when managing the stress and sleep aspects of PCOS/PMOS."
        ),
        "relevance_general": (
            "HRV is a general marker of how your stress-and-recovery balance is "
            "trending."
        ),
        "recs": [
            ("Prioritizing sleep is associated with better recovery markers.", "fernandez2018"),
            ("Attention to stress and emotional wellbeing is often emphasized.", "cooney2017"),
        ],
    },
    "resting_hr": {
        "measures": (
            "Resting heart rate (beats per minute) is your heart rate at rest. "
            "Lower values are generally associated with being well-rested."
        ),
        "relevance_pcos": (
            "Resting heart rate is a general cardiometabolic marker; "
            "cardiometabolic health is a frequent focus in PCOS/PMOS management."
        ),
        "relevance_general": (
            "Resting heart rate is a general indicator of rest and fitness."
        ),
        "recs": [
            ("Structured exercise is linked to cardiometabolic improvements.", "patten2020"),
            ("Consistent sleep supports resting heart rate.", "fernandez2018"),
        ],
    },
    "sleep_duration": {
        "measures": (
            "Sleep duration is the total time asleep each night. Most adults are "
            "commonly encouraged to aim for roughly 7–9 hours."
        ),
        "relevance_pcos": (
            "Sleep disturbances are reported more often in PCOS/PMOS, so sleep is "
            "a common area to monitor when managing it."
        ),
        "relevance_general": (
            "Sleep duration is foundational to how rested and recovered you feel."
        ),
        "recs": [
            ("A regular sleep routine is associated with better sleep health.", "fernandez2018"),
            ("An individualized lifestyle approach is recommended overall.", "teede2023"),
        ],
    },
    "strain": {
        "measures": (
            "Strain is a daily score (0–21) summarizing cardiovascular load from "
            "activity. Higher strain means a more demanding day for your body."
        ),
        "relevance_pcos": (
            "Physical activity is a commonly recommended lifestyle factor in "
            "PCOS/PMOS; strain gives a sense of your activity load over time."
        ),
        "relevance_general": (
            "Strain reflects how physically demanding your days are."
        ),
        "recs": [
            ("Structured exercise is associated with cardiometabolic benefits.", "patten2020"),
            ("Balance activity with recovery; consistency matters more than intensity.", "teede2023"),
        ],
    },
}


def _recent_mean(
    metrics: list[DailyMetricData], attr: str, days: int
) -> float | None:
    """Mean of the metric over the last `days` calendar days, excluding gaps."""
    if not metrics:
        return None
    end = metrics[-1].date
    cutoff = end - timedelta(days=days - 1)
    vals = [
        float(getattr(m, attr))
        for m in metrics
        if m.date >= cutoff and getattr(m, attr) is not None
    ]
    return round(sum(vals) / len(vals), 1) if vals else None


def _recommendations_for(key: str, diagnosis: str) -> list[InsightRecommendation]:
    know = METRIC_KNOWLEDGE.get(key)
    if not know:
        return []
    out: list[InsightRecommendation] = []
    for text, cid in know["recs"]:
        ref = get_by_id(cid)
        out.append(
            InsightRecommendation(
                text=text,
                citation_id=cid,
                citation_label=f"{ref.authors}, {ref.year}" if ref else None,
            )
        )
    return out


def _slope(x: np.ndarray, y: np.ndarray) -> float:
    """Ordinary least-squares slope of y over x (per unit x)."""
    x_mean = x.mean()
    y_mean = y.mean()
    denom = float(((x - x_mean) ** 2).sum())
    if denom == 0:
        return 0.0
    return float(((x - x_mean) * (y - y_mean)).sum() / denom)


def _trend_for(
    metrics: list[DailyMetricData],
    attr: str,
    key: str,
    label: str,
    unit: str | None,
    diagnosis: str = "none",
) -> TrendInsight:
    total = len(metrics)
    indexed = [
        (i, float(getattr(m, attr)))
        for i, m in enumerate(metrics)
        if getattr(m, attr) is not None
    ]
    n = len(indexed)
    coverage = round(100 * n / total, 1) if total else 0.0
    window_start = metrics[0].date if metrics else None
    window_end = metrics[-1].date if metrics else None

    # Rich descriptive detail shared across both return paths.
    know = METRIC_KNOWLEDGE.get(key, {})
    measures = know.get("measures", "")
    relevance = (
        know.get("relevance_pcos", "")
        if diagnosis == "pcos_pmos"
        else know.get("relevance_general", "")
    )
    avg_week = _recent_mean(metrics, attr, 7)
    avg_month = _recent_mean(metrics, attr, 30)
    avg_year = _recent_mean(metrics, attr, 365)
    recs = _recommendations_for(key, diagnosis)

    if n < 3:
        return TrendInsight(
            metric_key=key, metric_label=label, unit=unit,
            direction="insufficient data", change_per_week=None, baseline=None,
            sample_size=n, coverage_pct=coverage,
            window_start=window_start, window_end=window_end,
            low_confidence=True,
            description=f"Not enough {label.lower()} readings to describe a trend.",
            measures=measures, relevance=relevance,
            avg_week=avg_week, avg_month=avg_month, avg_year=avg_year,
            recommendations=recs,
        )

    x = np.array([i for i, _ in indexed], dtype=float)
    y = np.array([v for _, v in indexed], dtype=float)
    slope_per_day = _slope(x, y)
    per_week = round(slope_per_day * 7, 2)
    baseline = round(float(y.mean()), 1)

    spread = float(y.std()) or 1.0
    if abs(slope_per_day * 7) < 0.15 * spread:
        direction = "stable"
    elif slope_per_day > 0:
        direction = "rising"
    else:
        direction = "falling"

    low_conf = n < MIN_SAMPLE or coverage < MIN_COVERAGE_PCT
    unit_txt = unit if unit and unit != "min" else ""
    if direction == "stable":
        desc = (
            f"Your {label.lower()} has stayed pretty steady lately, "
            f"usually around {baseline}{unit_txt}."
        )
    else:
        way = "going up" if direction == "rising" else "going down"
        desc = (
            f"Your {label.lower()} has been {way} a little lately "
            f"(about {abs(per_week)}{unit_txt} a week), and usually sits "
            f"around {baseline}{unit_txt}."
        )

    return TrendInsight(
        metric_key=key, metric_label=label, unit=unit,
        direction=direction, change_per_week=per_week, baseline=baseline,
        sample_size=n, coverage_pct=coverage,
        window_start=window_start, window_end=window_end,
        low_confidence=low_conf, description=desc,
        measures=measures, relevance=relevance,
        avg_week=avg_week, avg_month=avg_month, avg_year=avg_year,
        recommendations=recs,
    )


def _pearson(x: np.ndarray, y: np.ndarray) -> float | None:
    if len(x) < 2 or x.std() == 0 or y.std() == 0:
        return None
    return float(np.corrcoef(x, y)[0, 1])


def _strength(r: float) -> str:
    a = abs(r)
    if a < 0.2:
        return "none"
    if a < 0.4:
        return "weak"
    if a < 0.6:
        return "moderate"
    return "strong"


def _association_for(
    metrics: list[DailyMetricData],
    symptom_by_date: dict[date, dict[str, int | None]],
    symptom_attr: str,
    symptom_label: str,
    metric_attr: str,
    metric_key: str,
    metric_label: str,
) -> AssociationInsight:
    total = len(metrics)
    pairs: list[tuple[float, float]] = []
    for m in metrics:
        metric_val = getattr(m, metric_attr)
        sym = symptom_by_date.get(m.date)
        sym_val = sym.get(symptom_attr) if sym else None
        if metric_val is not None and sym_val is not None:
            pairs.append((float(sym_val), float(metric_val)))

    n = len(pairs)
    coverage = round(100 * n / total, 1) if total else 0.0
    window_start = metrics[0].date if metrics else None
    window_end = metrics[-1].date if metrics else None
    low_conf = n < MIN_SAMPLE or coverage < MIN_COVERAGE_PCT

    base = dict(
        symptom_key=symptom_attr, symptom_label=symptom_label,
        metric_key=metric_key, metric_label=metric_label,
        sample_size=n, coverage_pct=coverage,
        window_start=window_start, window_end=window_end,
    )

    uncertainty = (
        f"Based on {n} day(s) where both {symptom_label.lower()} and "
        f"{metric_label.lower()} were recorded ({coverage}% of the period). "
        "This is a descriptive co-occurrence, not evidence of cause and effect."
    )
    if low_conf:
        uncertainty += " Treat it as low-confidence due to limited data."

    if n < MIN_SAMPLE:
        return AssociationInsight(
            **base, correlation=None, strength="insufficient data",
            direction="none", low_confidence=True,
            description=(
                f"There isn’t enough paired data yet to describe how your "
                f"{symptom_label.lower()} and {metric_label.lower()} move together."
            ),
            uncertainty_note=uncertainty,
        )

    x = np.array([s for s, _ in pairs])
    y = np.array([mv for _, mv in pairs])
    r = _pearson(x, y)
    if r is None:
        return AssociationInsight(
            **base, correlation=None, strength="none", direction="none",
            low_confidence=True,
            description=(
                f"Your {symptom_label.lower()} and {metric_label.lower()} did not "
                "vary enough together to describe a relationship."
            ),
            uncertainty_note=uncertainty,
        )

    strength = _strength(r)
    direction = "negative" if r < 0 else "positive"
    r_round = round(r, 2)

    if strength == "none":
        desc = (
            f"On days you reported both, {symptom_label.lower()} and "
            f"{metric_label.lower()} showed little to no consistent co-movement "
            f"(r = {r_round})."
        )
    else:
        move = "lower" if direction == "negative" else "higher"
        desc = (
            f"On days you reported both, higher {symptom_label.lower()} tended to "
            f"co-occur with {move} {metric_label.lower()} "
            f"({strength} {direction} association, r = {r_round}). "
            "This describes a pattern in your data, not a cause."
        )

    return AssociationInsight(
        **base, correlation=r_round, strength=strength, direction=direction,
        low_confidence=low_conf, description=desc, uncertainty_note=uncertainty,
    )


def build_insights(db: Session, user=None) -> InsightsResponse:
    user = user or get_active_user(db)
    source = get_default_source(db)
    metrics = source.get_daily_metrics(user.id)

    dx = user.diagnosis or "none"
    trends = [
        _trend_for(metrics, attr, key, label, unit, dx)
        for attr, key, label, unit in TREND_METRICS
    ]

    disclaimer = DISCLAIMER
    if (user.diagnosis or "none") == "pcos_pmos":
        disclaimer += (
            " You've noted a PCOS/PMOS context, so these patterns are framed with "
            "PCOS/PMOS-relevant signals (cycle, sleep, recovery, metabolic markers) "
            "in mind. This remains descriptive and is not a diagnosis."
        )
    else:
        disclaimer += (
            " You haven't noted a specific diagnosis, so these are general "
            "descriptive patterns in your own data."
        )

    return InsightsResponse(
        source_label=source.label,
        is_synthetic=source.is_synthetic,
        disclaimer=disclaimer,
        trends=trends,
    )


# --- Per-day insights (dashboard calendar) ---------------------------------

_SYMPTOM_LABELS = {
    "fatigue": "fatigue",
    "mood": "mood",
    "stress": "stress",
    "acne": "acne",
    "sleep_quality": "sleep quality",
}


def _mean(values: list[float]) -> float | None:
    vals = [v for v in values if v is not None]
    return sum(vals) / len(vals) if vals else None


def build_day_insights(db: Session, user=None) -> DayInsightsResponse:
    """Build a short, descriptive insight for each day from that day's wearable
    readings (compared to the user's own averages) and journal entry.

    Strictly descriptive — never causal or diagnostic. Days with no data get a
    gentle "nothing logged" note.
    """
    user = user or get_active_user(db)
    source = get_default_source(db)
    metrics = source.get_daily_metrics(user.id)

    entries = {
        e.date: e
        for e in db.scalars(
            select(JournalEntry).where(JournalEntry.user_id == user.id)
        ).all()
    }

    # Personal baselines (means over the window) for comparison.
    avg_recovery = _mean([m.recovery_score for m in metrics])
    avg_sleep = _mean([m.sleep_duration_min for m in metrics])
    avg_strain = _mean([m.strain for m in metrics])

    def band(v, avg, higher_is_better=True):
        if v is None or avg is None:
            return None
        diff = v - avg
        if abs(diff) < 0.06 * (avg or 1):
            return "around your usual"
        up = diff > 0
        good = up if higher_is_better else not up
        return ("a bit higher than usual" if up else "a bit lower than usual"), good

    days: list[DayInsight] = []
    for m in metrics:
        entry = entries.get(m.date)
        has_metrics = any(
            getattr(m, a) is not None
            for a in (
                "recovery_score",
                "resting_hr",
                "hrv_ms",
                "sleep_duration_min",
                "strain",
            )
        )
        has_journal = entry is not None
        details: list[str] = []

        # Wearable lines (compared to personal baseline).
        if m.recovery_score is not None and avg_recovery is not None:
            b = band(m.recovery_score, avg_recovery, higher_is_better=True)
            if isinstance(b, tuple):
                details.append(
                    f"Recovery was {round(m.recovery_score)}% — {b[0]}."
                )
        if m.sleep_duration_min is not None:
            hrs = int(m.sleep_duration_min // 60)
            mins = int(m.sleep_duration_min % 60)
            details.append(f"You slept about {hrs}h {mins:02d}m.")
        if m.strain is not None and avg_strain is not None:
            b = band(m.strain, avg_strain, higher_is_better=True)
            if isinstance(b, tuple):
                details.append(
                    f"Strain was {round(m.strain, 1)} — {b[0]} activity."
                )

        # Journal lines.
        if entry is not None:
            reported = []
            for attr, label in _SYMPTOM_LABELS.items():
                v = getattr(entry, attr)
                if v is not None:
                    reported.append(f"{label} {v}/5")
            if entry.menstrual_flow:
                reported.append(f"flow {entry.menstrual_flow}")
            if reported:
                details.append("You logged: " + ", ".join(reported) + ".")
            if entry.other_symptoms:
                details.append(f"Note: {entry.other_symptoms}")

        # Headline: a gentle, descriptive takeaway.
        if not has_metrics and not has_journal:
            headline = "Nothing logged this day."
        elif (
            m.recovery_score is not None
            and avg_recovery is not None
            and m.recovery_score >= avg_recovery
            and entry is not None
            and entry.fatigue is not None
            and entry.fatigue <= 2
        ):
            headline = "A steady day — recovery held up and fatigue was low."
        elif (
            m.recovery_score is not None
            and avg_recovery is not None
            and m.recovery_score < avg_recovery
            and entry is not None
            and entry.fatigue is not None
            and entry.fatigue >= 4
        ):
            headline = (
                "A heavier day — recovery dipped and you noted higher fatigue."
            )
        elif has_metrics and has_journal:
            headline = "Wearable readings and your journal are both in for this day."
        elif has_metrics:
            headline = "Wearable readings are in; no journal entry yet."
        else:
            headline = "Journal entry logged; no wearable readings this day."

        days.append(
            DayInsight(
                date=m.date,
                has_metrics=has_metrics,
                has_journal=has_journal,
                headline=headline,
                details=details,
            )
        )

    return DayInsightsResponse(
        source_label=source.label,
        is_synthetic=source.is_synthetic,
        days=days,
        disclaimer=DISCLAIMER,
    )


# --- Signals summary: how wearable data connects to PCOS/PMOS --------------

# Metric -> curated reference id that best supports its PCOS/PMOS relevance.
_METRIC_REF = {
    "recovery": "fernandez2018",
    "hrv": "cooney2017",
    "resting_hr": "patten2020",
    "sleep_duration": "fernandez2018",
    "strain": "patten2020",
}


def build_signals_summary(db: Session, user=None) -> SignalsSummary:
    """Summarize how each wearable signal relates to PCOS/PMOS, grounded in the
    user's own trends and the curated research. Descriptive, never diagnostic.
    """
    user = user or get_active_user(db)
    dx = user.diagnosis or "none"
    insights = build_insights(db, user)
    trend_by_key = {t.metric_key: t for t in insights.trends}

    connections: list[SignalConnection] = []
    ref_ids: set[str] = set()
    for key in ("recovery", "hrv", "resting_hr", "sleep_duration", "strain"):
        know = METRIC_KNOWLEDGE.get(key, {})
        label = {
            "recovery": "Recovery",
            "hrv": "HRV",
            "resting_hr": "Resting HR",
            "sleep_duration": "Sleep",
            "strain": "Strain",
        }[key]
        t = trend_by_key.get(key)
        your_trend = (
            t.description
            if t and t.direction != "insufficient data"
            else f"Not enough {label.lower()} data yet to describe your trend."
        )
        pcos = (
            know.get("relevance_pcos", "")
            if dx == "pcos_pmos"
            else know.get("relevance_general", "")
        )
        connections.append(
            SignalConnection(
                metric_key=key,
                metric_label=label,
                your_trend=your_trend,
                pcos_connection=pcos,
            )
        )
        rid = _METRIC_REF.get(key)
        if rid:
            ref_ids.add(rid)

    if dx == "pcos_pmos":
        intro = (
            "Here's how your wearable signals connect to PCOS/PMOS. PCOS/PMOS "
            "often involves sleep, stress, and metabolic patterns, and your "
            "WHOOP-style signals give a window into those day to day. This is "
            "descriptive context from your own data — not a diagnosis."
        )
    else:
        intro = (
            "You haven't noted a PCOS/PMOS diagnosis, so here's a general look at "
            "what each of your wearable signals reflects. If you add a diagnosis "
            "in your profile, I'll tailor this to PCOS/PMOS."
        )

    refs = [get_by_id(r) for r in ref_ids]
    citations = [
        BuddyCitation(
            id=r.id, title=r.title, authors=r.authors, year=r.year,
            source=r.source, summary=r.summary, url=r.url,
        )
        for r in refs
        if r is not None
    ]
    # Fall back to a general reference if none matched.
    if not citations:
        fallback = find_references(["overview", "guideline"])
        citations = [
            BuddyCitation(
                id=r.id, title=r.title, authors=r.authors, year=r.year,
                source=r.source, summary=r.summary, url=r.url,
            )
            for r in fallback
        ]

    return SignalsSummary(
        diagnosis=dx,
        intro=intro,
        connections=connections,
        citations=citations,
        disclaimer=DISCLAIMER,
    )
