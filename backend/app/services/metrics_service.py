"""Compute dashboard summary stats and trend series from a WHOOP data source.

All computations exclude missing (None) values from denominators and statistics.
A missing day is a gap, never a zero.
"""

from __future__ import annotations

from datetime import date
from statistics import fmean

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.data.synthetic import DailyMetricData
from app.models import JournalEntry
from app.schemas import (
    MetricsSummary,
    MetricsTrends,
    MetricStat,
    RecentSymptom,
    TrendPoint,
    TrendSeries,
    UserOut,
)
from app.services.users import get_active_user
from app.services.whoop_adapter import get_default_source

# (attribute on DailyMetricData, key, label, unit)
METRIC_DEFS: list[tuple[str, str, str, str | None]] = [
    ("recovery_score", "recovery", "Recovery", "%"),
    ("resting_hr", "resting_hr", "Resting HR", "bpm"),
    ("hrv_ms", "hrv", "HRV", "ms"),
    ("sleep_duration_min", "sleep_duration", "Sleep duration", "min"),
    ("sleep_efficiency_pct", "sleep_efficiency", "Sleep efficiency", "%"),
    ("strain", "strain", "Strain", None),
]

SYMPTOM_DEFS: list[tuple[str, str]] = [
    ("fatigue", "Fatigue"),
    ("mood", "Mood"),
    ("stress", "Stress"),
    ("acne", "Acne"),
    ("sleep_quality", "Sleep quality"),
]


def _values_with_dates(
    metrics: list[DailyMetricData], attr: str
) -> list[tuple[date, float]]:
    out: list[tuple[date, float]] = []
    for m in metrics:
        v = getattr(m, attr)
        if v is not None:
            out.append((m.date, float(v)))
    return out


def build_summary(db: Session, user=None) -> MetricsSummary:
    user = user or get_active_user(db)
    source = get_default_source(db)
    metrics = source.get_daily_metrics(user.id)

    total_days = len(metrics)
    window_start = metrics[0].date if metrics else None
    window_end = metrics[-1].date if metrics else None

    stats: list[MetricStat] = []
    for attr, key, label, unit in METRIC_DEFS:
        pairs = _values_with_dates(metrics, attr)
        values = [v for _, v in pairs]
        n = len(values)
        latest_date, latest = (pairs[-1] if pairs else (None, None))
        stats.append(
            MetricStat(
                key=key,
                label=label,
                unit=unit,
                latest=round(latest, 1) if latest is not None else None,
                latest_date=latest_date,
                baseline=round(fmean(values), 1) if values else None,
                min=round(min(values), 1) if values else None,
                max=round(max(values), 1) if values else None,
                sample_size=n,
                coverage_pct=round(100 * n / total_days, 1) if total_days else 0.0,
            )
        )

    recent_symptoms = _recent_symptoms(db, user.id)

    return MetricsSummary(
        user=UserOut.model_validate(user),
        source_label=source.label,
        is_synthetic=source.is_synthetic,
        window_start=window_start,
        window_end=window_end,
        total_days=total_days,
        stats=stats,
        recent_symptoms=recent_symptoms,
    )


def _recent_symptoms(db: Session, user_id: int, limit: int = 6) -> list[RecentSymptom]:
    """Most recent *reported* symptom values (missing values are skipped)."""
    entries = db.scalars(
        select(JournalEntry)
        .where(JournalEntry.user_id == user_id)
        .order_by(JournalEntry.date.desc())
        .limit(14)
    ).all()

    out: list[RecentSymptom] = []
    for entry in entries:
        for attr, label in SYMPTOM_DEFS:
            value = getattr(entry, attr)
            if value is None:
                continue  # not reported -> excluded, never shown as zero
            out.append(
                RecentSymptom(
                    date=entry.date,
                    label=label,
                    value=value,
                    display=f"{label}: {value}/5",
                )
            )
            if len(out) >= limit:
                return out
    return out


def build_trends(db: Session, user=None) -> MetricsTrends:
    user = user or get_active_user(db)
    source = get_default_source(db)
    metrics = source.get_daily_metrics(user.id)

    series: list[TrendSeries] = []
    for attr, key, label, unit in METRIC_DEFS:
        points = [
            TrendPoint(date=m.date, value=getattr(m, attr)) for m in metrics
        ]
        values = [p.value for p in points if p.value is not None]
        baseline = round(fmean(values), 1) if values else None
        series.append(
            TrendSeries(
                key=key, label=label, unit=unit, baseline=baseline, points=points
            )
        )

    return MetricsTrends(
        source_label=source.label,
        is_synthetic=source.is_synthetic,
        series=series,
    )
