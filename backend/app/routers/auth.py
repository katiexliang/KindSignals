"""Authentication endpoints: signup, login, and current-user.

Each email is a distinct account. Signup provisions a new user with their own
seeded synthetic WHOOP data so their dashboard has signal from day one.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import (
    AuthResponse,
    LoginRequest,
    OnboardingRequest,
    SignupRequest,
    UserOut,
)
from app.services.auth import create_token, get_current_user, verify_password
from app.services.provisioning import attach_synthetic_whoop, create_user
from datetime import datetime, timezone
from app.models import Connection

router = APIRouter(prefix="/auth", tags=["auth"])


def _normalize_email(email: str) -> str:
    return email.strip().lower()


@router.post("/signup", response_model=AuthResponse, status_code=201)
def signup(payload: SignupRequest, db: Session = Depends(get_db)) -> AuthResponse:
    email = _normalize_email(payload.email)
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=422, detail="Enter a valid email address.")

    existing = db.scalar(select(User).where(User.email == email))
    if existing is not None:
        raise HTTPException(
            status_code=409, detail="An account with this email already exists."
        )

    user = create_user(
        db, email=email, password=payload.password, name=payload.name or ""
    )
    return AuthResponse(token=create_token(user.id), user=UserOut.model_validate(user))


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    email = _normalize_email(payload.email)
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(payload.password, user.password_hash):
        # Same message for both cases: don't reveal which emails exist.
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    return AuthResponse(token=create_token(user.id), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> UserOut:
    """Return the authenticated user (validates the session token)."""
    return UserOut.model_validate(user)


@router.post("/onboarding", response_model=UserOut)
def complete_onboarding(
    payload: OnboardingRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserOut:
    """Save onboarding answers and optionally connect data sources.

    Connecting WHOOP attaches the user's own synthetic dataset (demo). A health
    app connection is recorded as a pending/future integration.
    """
    if payload.name and payload.name.strip():
        user.name = payload.name.strip()
    user.birthdate = payload.birthdate
    user.diagnosis = payload.diagnosis or "none"
    user.contraception_method = payload.contraception_method or "none"
    user.onboarding_complete = True
    db.add(user)
    db.commit()

    if payload.connect_whoop:
        attach_synthetic_whoop(db, user)

    if payload.connect_health:
        # Record intent to connect a health app; real sync is a future step.
        existing = db.scalar(
            select(Connection).where(
                Connection.user_id == user.id,
                Connection.provider == "apple_health",
            )
        )
        if existing is None:
            db.add(
                Connection(
                    user_id=user.id,
                    provider="apple_health",
                    status="not_connected",
                    is_synthetic=True,
                    connected_at=None,
                )
            )
            db.commit()

    db.refresh(user)
    return UserOut.model_validate(user)
