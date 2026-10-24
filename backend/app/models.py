"""SQLAlchemy ORM models for KindSignals.

Design notes:
- All numeric metric/symptom columns are nullable so that a *missing* value is a
  real NULL, never a stand-in zero. Missing data must never be read as a
  "normal" or "no symptom" value (see responsible-health-ai steering).
- Every data row carries `is_synthetic` and a `source` label so demo data stays
  clearly distinguishable from a future real WHOOP integration.
"""

from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    """A KindSignals user. For the MVP this is the seeded demo persona."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str | None] = mapped_column(
        String(255), unique=True, index=True, nullable=True
    )
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    birthdate: Mapped[date | None] = mapped_column(Date, nullable=True)
    # Diagnosis context drives how insights/Signals are framed.
    # One of: "none" | "pcos_pmos".
    diagnosis: Mapped[str | None] = mapped_column(String(120), nullable=True)
    # Contraception method (profile-level), e.g. "none", "pill", "iud", ...
    contraception_method: Mapped[str | None] = mapped_column(String(40), nullable=True)
    # Whether the post-signup onboarding flow has been completed.
    onboarding_complete: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    is_demo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )

    daily_metrics: Mapped[list["DailyMetric"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    journal_entries: Mapped[list["JournalEntry"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    connections: Mapped[list["Connection"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class DailyMetric(Base):
    """One day of WHOOP-compatible physiological metrics.

    Any metric column may be NULL to represent a day the device did not report
    that value (an intentional gap in the demo data).
    """

    __tablename__ = "daily_metrics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    recovery_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    resting_hr: Mapped[float | None] = mapped_column(Float, nullable=True)
    hrv_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    sleep_duration_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    sleep_efficiency_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    strain: Mapped[float | None] = mapped_column(Float, nullable=True)

    source: Mapped[str] = mapped_column(String(40), default="synthetic", nullable=False)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    user: Mapped["User"] = relationship(back_populates="daily_metrics")


class JournalEntry(Base):
    """A voluntary daily journal entry.

    Every symptom/observation field is nullable. A blank field is stored as NULL
    and must be treated as 'not reported', not as a zero or a 'no symptom'.
    Ordinal symptom fields use a 0-5 scale when present.
    """

    __tablename__ = "journal_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    # Menstrual / cycle observations.
    menstrual_flow: Mapped[str | None] = mapped_column(String(20), nullable=True)
    cycle_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Voluntary contraception note for the day (e.g. "taken", "missed", or a
    # method label). NULL means not reported, never "none".
    contraception: Mapped[str | None] = mapped_column(String(40), nullable=True)

    # Ordinal symptoms (0-5 when present).
    fatigue: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mood: Mapped[int | None] = mapped_column(Integer, nullable=True)
    stress: Mapped[int | None] = mapped_column(Integer, nullable=True)
    acne: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sleep_quality: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Free-text / optional context.
    other_symptoms: Mapped[str | None] = mapped_column(Text, nullable=True)
    lifestyle_factors: Mapped[str | None] = mapped_column(Text, nullable=True)
    medication_context: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="journal_entries")


class Connection(Base):
    """A data-source connection the user can grant permission to.

    For the demo, granting a connection attaches synthetic data and marks the
    provider connected. A real integration (WHOOP OAuth, Apple Health, Samsung
    Health) would replace the synthetic attach with an authenticated sync.
    """

    __tablename__ = "connections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    #: Provider key: "whoop" | "apple_health" | "samsung_health".
    provider: Mapped[str] = mapped_column(String(40), nullable=False)
    #: "connected" | "not_connected".
    status: Mapped[str] = mapped_column(
        String(20), default="not_connected", nullable=False
    )
    #: Whether the attached data is synthetic (always true in the demo).
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    connected_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    user: Mapped["User"] = relationship(back_populates="connections")
