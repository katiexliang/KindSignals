"""Create the database schema and seed the demo persona + synthetic data.

Run from the `backend/` directory with the venv active:

    python -m app.data.seed            # seed if empty
    python -m app.data.seed --reset    # drop & recreate, then seed

All seeded data is synthetic and flagged as such.
"""

from __future__ import annotations

import argparse
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import Base, SessionLocal, engine
from app.data.synthetic import generate_dataset
from app.models import DailyMetric, JournalEntry, User

DEMO_USER_NAME = "Livie"


def _get_demo_user(db: Session) -> User | None:
    return db.scalar(select(User).where(User.name == DEMO_USER_NAME))


def seed(reset: bool = False) -> dict:
    """Seed the database. Returns a small summary dict."""
    if reset:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        existing = _get_demo_user(db)
        if existing is not None and not reset:
            return {
                "status": "skipped",
                "reason": "demo user already exists",
                "user_id": existing.id,
            }

        user = User(
            name=DEMO_USER_NAME,
            birthdate=date(2001, 3, 14),  # ~25yo; age is derived, never stored
            diagnosis="pcos_pmos",
            contraception_method="none",
            is_demo=True,
        )
        db.add(user)
        db.flush()  # assign user.id

        dataset = generate_dataset()

        for m in dataset.metrics:
            db.add(
                DailyMetric(
                    user_id=user.id,
                    date=m.date,
                    recovery_score=m.recovery_score,
                    resting_hr=m.resting_hr,
                    hrv_ms=m.hrv_ms,
                    sleep_duration_min=m.sleep_duration_min,
                    sleep_efficiency_pct=m.sleep_efficiency_pct,
                    strain=m.strain,
                    source=m.source,
                    is_synthetic=m.is_synthetic,
                )
            )

        for j in dataset.journals:
            db.add(
                JournalEntry(
                    user_id=user.id,
                    date=j.date,
                    menstrual_flow=j.menstrual_flow,
                    cycle_notes=j.cycle_notes,
                    fatigue=j.fatigue,
                    mood=j.mood,
                    stress=j.stress,
                    acne=j.acne,
                    sleep_quality=j.sleep_quality,
                    other_symptoms=j.other_symptoms,
                    lifestyle_factors=j.lifestyle_factors,
                    medication_context=j.medication_context,
                    is_synthetic=j.is_synthetic,
                )
            )

        db.commit()

        return {
            "status": "seeded",
            "user_id": user.id,
            "user": user.name,
            "metrics": len(dataset.metrics),
            "journal_entries": len(dataset.journals),
        }


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed KindSignals demo data.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Drop and recreate all tables before seeding.",
    )
    args = parser.parse_args()
    result = seed(reset=args.reset)
    print(result)


if __name__ == "__main__":
    main()
