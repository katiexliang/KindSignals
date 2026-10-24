"""WHOOP-compatible data source abstraction.

Downstream code (metrics API, insight engine) depends only on the
`WhoopDataSource` protocol, never on how the data is produced. Phase 1 wires
`SyntheticWhoopSource`, which reads the seeded synthetic rows from the database.
A future `WhoopApiSource` can be dropped in to pull real, authenticated WHOOP
data without changing any consumer.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.data.synthetic import DailyMetricData
from app.models import DailyMetric


@runtime_checkable
class WhoopDataSource(Protocol):
    """Interface every WHOOP data source must satisfy."""

    #: Human-readable label surfaced in the UI (e.g. "Synthetic (demo)").
    label: str
    #: Whether this source produces synthetic data.
    is_synthetic: bool

    def get_daily_metrics(self, user_id: int) -> list[DailyMetricData]:
        """Return daily metrics for a user, ordered by date ascending.

        Missing values are represented as None (never zero).
        """
        ...


class SyntheticWhoopSource:
    """Reads the seeded synthetic metrics from the local database."""

    label = "Synthetic (demo)"
    is_synthetic = True

    def __init__(self, db: Session) -> None:
        self._db = db

    def get_daily_metrics(self, user_id: int) -> list[DailyMetricData]:
        rows = self._db.scalars(
            select(DailyMetric)
            .where(DailyMetric.user_id == user_id)
            .order_by(DailyMetric.date.asc())
        ).all()
        return [
            DailyMetricData(
                date=r.date,
                recovery_score=r.recovery_score,
                resting_hr=r.resting_hr,
                hrv_ms=r.hrv_ms,
                sleep_duration_min=r.sleep_duration_min,
                sleep_efficiency_pct=r.sleep_efficiency_pct,
                strain=r.strain,
                source=r.source,
                is_synthetic=r.is_synthetic,
            )
            for r in rows
        ]


class WhoopApiSource:
    """Placeholder for a future real, OAuth-authenticated WHOOP source.

    Intentionally unimplemented in the MVP. It exists to document the extension
    point: swapping this in for `SyntheticWhoopSource` must not require changes
    to any consumer of `WhoopDataSource`.
    """

    label = "WHOOP (live)"
    is_synthetic = False

    def __init__(self, access_token: str) -> None:
        self._access_token = access_token

    def get_daily_metrics(self, user_id: int) -> list[DailyMetricData]:  # noqa: ARG002
        raise NotImplementedError(
            "Live WHOOP API integration is a future enhancement (out of MVP scope)."
        )


def get_default_source(db: Session) -> WhoopDataSource:
    """Factory for the active data source. Phase 1 returns the synthetic source."""
    return SyntheticWhoopSource(db)
