"""Helpers for resolving the active user.

For the MVP there is a single seeded demo user (Livie). This module centralizes
"which user" logic so feature routers don't duplicate it, and so multi-user
support can be added later in one place.
"""

from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User


def get_active_user(db: Session) -> User:
    """Return the demo user, or 404 if the database has not been seeded."""
    user = db.scalar(select(User).order_by(User.id.asc()).limit(1))
    if user is None:
        raise HTTPException(
            status_code=404,
            detail="No user found. Seed the database with `python -m app.data.seed`.",
        )
    return user


def update_user(db: Session, user: User, fields: dict) -> User:
    """Apply partial profile updates to a specific user and persist them.

    Only keys present in ``fields`` are written.
    """
    for key, value in fields.items():
        if hasattr(user, key):
            setattr(user, key, value)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
