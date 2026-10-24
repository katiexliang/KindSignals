"""Journal endpoints: list and create voluntary entries.

Blank fields are stored as NULL and never coerced to a default. Creating an
entry for a date that already has one updates it (upsert) so the demo stays
clean across repeated submissions.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import DailyMetric, JournalEntry
from app.schemas import JournalEntryCreate, JournalEntryOut
from app.services.auth import get_current_user
from app.models import User

router = APIRouter(prefix="/journal", tags=["journal"])

_EDITABLE_FIELDS = (
    "menstrual_flow",
    "cycle_notes",
    "contraception",
    "fatigue",
    "mood",
    "stress",
    "acne",
    "sleep_quality",
    "other_symptoms",
    "lifestyle_factors",
    "medication_context",
)


@router.get("", response_model=list[JournalEntryOut])
def list_entries(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[JournalEntry]:
    """Return all journal entries for the active user, most recent first."""
    return list(
        db.scalars(
            select(JournalEntry)
            .where(JournalEntry.user_id == user.id)
            .order_by(JournalEntry.date.desc())
        ).all()
    )


@router.post("", response_model=JournalEntryOut, status_code=201)
def create_entry(
    payload: JournalEntryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> JournalEntry:
    """Create (or update) the entry for a given date.

    Omitted fields remain/become NULL. A user-created entry is flagged
    is_synthetic=False so it is distinguishable from seeded demo data.
    """
    entry = db.scalar(
        select(JournalEntry).where(
            JournalEntry.user_id == user.id, JournalEntry.date == payload.date
        )
    )
    if entry is None:
        entry = JournalEntry(user_id=user.id, date=payload.date)
        db.add(entry)

    for field in _EDITABLE_FIELDS:
        setattr(entry, field, getattr(payload, field))
    entry.is_synthetic = False  # this entry came from a real user action

    # If the user entered any wearable readings manually (no-diagnosis users
    # without a connected device), upsert them into that day's DailyMetric so
    # the dashboard, insights, and calendars reflect them automatically.
    _WEARABLE_FIELDS = (
        "recovery_score",
        "resting_hr",
        "hrv_ms",
        "sleep_duration_min",
        "sleep_efficiency_pct",
        "strain",
    )
    manual = {
        f: getattr(payload, f)
        for f in _WEARABLE_FIELDS
        if getattr(payload, f) is not None
    }
    if manual:
        metric = db.scalar(
            select(DailyMetric).where(
                DailyMetric.user_id == user.id, DailyMetric.date == payload.date
            )
        )
        if metric is None:
            metric = DailyMetric(
                user_id=user.id,
                date=payload.date,
                source="manual",
                is_synthetic=False,
            )
            db.add(metric)
        else:
            metric.source = "manual"
            metric.is_synthetic = False
        for f, v in manual.items():
            setattr(metric, f, v)

    db.commit()
    db.refresh(entry)
    return entry
