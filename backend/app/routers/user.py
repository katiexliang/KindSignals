"""User profile endpoints: read, edit, and connected data sources.

Profile edits are persisted to the database (SQLite). Wearable data continues
to flow through the WHOOP adapter, so user-entered profile fields and
device/AI sources stay cleanly separated.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from fastapi import HTTPException

from app.schemas import (
    CONTRACEPTION_CHOICES,
    ConnectedSource,
    ConnectedSources,
    DIAGNOSIS_CHOICES,
    UserOut,
    UserUpdate,
)
from app.services.auth import get_current_user
from app.services.users import update_user
from app.models import User
from app.services.whoop_adapter import get_default_source

router = APIRouter(prefix="/user", tags=["user"])


@router.get("", response_model=UserOut)
def read_user(user: User = Depends(get_current_user)) -> UserOut:
    """Return the authenticated user's profile."""
    return UserOut.model_validate(user)


@router.patch("", response_model=UserOut)
def edit_user(payload: UserUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> UserOut:
    """Update editable profile fields. Only provided fields are changed."""
    fields = payload.model_dump(exclude_unset=True)

    if "diagnosis" in fields and fields["diagnosis"] not in DIAGNOSIS_CHOICES:
        raise HTTPException(
            status_code=422,
            detail=f"diagnosis must be one of {list(DIAGNOSIS_CHOICES)}",
        )
    if (
        "contraception_method" in fields
        and fields["contraception_method"] not in CONTRACEPTION_CHOICES
    ):
        raise HTTPException(
            status_code=422,
            detail=f"contraception_method must be one of {list(CONTRACEPTION_CHOICES)}",
        )

    user = update_user(db, user, fields)
    return UserOut.model_validate(user)


@router.get("/connected", response_model=ConnectedSources)
def connected_sources(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> ConnectedSources:
    """List the data integrations backing the app (wearable + AI).

    Nothing here is hardcoded in the UI — the statuses are derived from the
    active WHOOP adapter and the configured Signals (LLM) provider.
    """
    source = get_default_source(db)

    wearable = ConnectedSource(
        key="whoop",
        name="WHOOP",
        category="wearable",
        status=source.label,
        is_synthetic=source.is_synthetic,
        detail=(
            "Physiological data (recovery, HRV, resting HR, sleep, strain) is "
            "read through the WHOOP-compatible adapter. The demo uses synthetic "
            "data; a real authenticated WHOOP connection can be added later "
            "without changing the app."
        ),
    )

    using_fallback = settings.llm_provider.lower() == "fallback"
    ai = ConnectedSource(
        key="signals_ai",
        name="Signals companion",
        category="ai",
        status="Deterministic (no API key)" if using_fallback else settings.llm_provider,
        is_synthetic=using_fallback,
        detail=(
            "Explanations are generated locally with a deterministic, citation-"
            "grounded fallback — no external API key required. Configure an LLM "
            "provider to enable a model-backed companion."
        ),
    )

    return ConnectedSources(sources=[wearable, ai])


@router.delete("", status_code=204)
def delete_account(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> Response:
    """Permanently delete the authenticated user and all their data.

    Cascades to the user's metrics, journal entries, and connections. The seeded
    demo persona is protected so the shared demo login keeps working.
    """
    if user.is_demo:
        raise HTTPException(
            status_code=403,
            detail="The demo account can't be deleted.",
        )
    db.delete(user)
    db.commit()
    return Response(status_code=204)
