"""Create new users and attach their own synthetic demo dataset.

Each signup gets a deterministic-but-distinct synthetic WHOOP-style dataset
(seeded from the user id) so their dashboard isn't empty. Journals start empty
for a brand-new user to fill in themselves. All attached data is flagged
synthetic and surfaced as such in the UI.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.data.synthetic import generate_dataset
from app.models import Connection, DailyMetric, User
from app.services.auth import hash_password

# Base seed so per-user seeds (base + user_id) stay reproducible.
_SEED_BASE = 1000


def attach_synthetic_whoop(db: Session, user: User) -> None:
    """Attach a fresh synthetic WHOOP metric set to a user and mark connected."""
    dataset = generate_dataset(seed=_SEED_BASE + user.id)
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
                source="synthetic",
                is_synthetic=True,
            )
        )
    conn = db.scalar(
        select(Connection).where(
            Connection.user_id == user.id, Connection.provider == "whoop"
        )
    )
    if conn is None:
        conn = Connection(user_id=user.id, provider="whoop")
        db.add(conn)
    conn.status = "connected"
    conn.is_synthetic = True
    conn.connected_at = datetime.now(timezone.utc)
    db.commit()


def create_user(db: Session, email: str, password: str, name: str) -> User:
    """Create a new user with hashed credentials and seeded synthetic data."""
    user = User(
        email=email.strip().lower(),
        password_hash=hash_password(password),
        name=name.strip() or email.split("@")[0],
        is_demo=False,
        diagnosis="none",
        contraception_method="none",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    # Data is attached during onboarding if the user connects a source.
    return user
