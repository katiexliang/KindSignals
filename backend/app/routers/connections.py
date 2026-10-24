"""Data-source connections: WHOOP, Apple Health, Samsung Health.

The user grants permission to connect a source. In the demo, connecting WHOOP
attaches synthetic data. Apple Health and Samsung Health are presented as
future connections — the UI asks for permission, but a real authenticated sync
is out of scope for this build, so they are marked "coming_soon".
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Connection, DailyMetric, User
from app.schemas import ProviderInfo, ProvidersResponse
from app.services.auth import get_current_user
from app.services.provisioning import attach_synthetic_whoop

router = APIRouter(prefix="/connections", tags=["connections"])

# Providers surfaced in the UI. Only WHOOP is connectable in the demo.
_PROVIDER_META = {
    "whoop": {
        "name": "WHOOP",
        "connectable": True,
        "detail": (
            "Recovery, HRV, resting heart rate, sleep, and strain. In this demo "
            "WHOOP is connected with synthetic data. A real build would ask you "
            "to authorize your WHOOP account."
        ),
    },
    "apple_health": {
        "name": "Apple Health",
        "connectable": False,
        "detail": (
            "Connect Apple Health to bring in heart rate, sleep, and activity. "
            "A future release will ask for your permission to read these on your "
            "device."
        ),
    },
    "samsung_health": {
        "name": "Samsung Health",
        "connectable": False,
        "detail": (
            "Connect Samsung Health to bring in heart rate, sleep, and activity. "
            "A future release will ask for your permission to read these."
        ),
    },
}


def _status_for(db: Session, user: User, provider: str) -> str:
    conn = db.scalar(
        select(Connection).where(
            Connection.user_id == user.id, Connection.provider == provider
        )
    )
    if conn is not None and conn.status == "connected":
        return "connected"
    if not _PROVIDER_META[provider]["connectable"]:
        return "coming_soon"
    return "not_connected"


@router.get("", response_model=ProvidersResponse)
def list_providers(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> ProvidersResponse:
    providers = [
        ProviderInfo(
            provider=key,
            name=meta["name"],
            status=_status_for(db, user, key),
            is_synthetic=True,
            connectable=meta["connectable"],
            detail=meta["detail"],
        )
        for key, meta in _PROVIDER_META.items()
    ]
    return ProvidersResponse(providers=providers)


@router.post("/{provider}/connect", response_model=ProvidersResponse)
def connect(
    provider: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProvidersResponse:
    if provider not in _PROVIDER_META:
        raise HTTPException(status_code=404, detail="Unknown provider.")
    if not _PROVIDER_META[provider]["connectable"]:
        raise HTTPException(
            status_code=400,
            detail=(
                f"{_PROVIDER_META[provider]['name']} connection is coming soon. "
                "A future release will request permission to connect."
            ),
        )
    # Demo: connecting WHOOP attaches synthetic data if the user has none.
    has_metrics = db.scalar(
        select(DailyMetric.id).where(DailyMetric.user_id == user.id).limit(1)
    )
    if has_metrics is None:
        attach_synthetic_whoop(db, user)
    else:
        conn = db.scalar(
            select(Connection).where(
                Connection.user_id == user.id, Connection.provider == provider
            )
        )
        if conn is None:
            conn = Connection(user_id=user.id, provider=provider)
            db.add(conn)
        conn.status = "connected"
        conn.is_synthetic = True
        conn.connected_at = datetime.now(timezone.utc)
        db.commit()

    return list_providers(db=db, user=user)


@router.post("/{provider}/disconnect", response_model=ProvidersResponse)
def disconnect(
    provider: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProvidersResponse:
    if provider not in _PROVIDER_META:
        raise HTTPException(status_code=404, detail="Unknown provider.")
    conn = db.scalar(
        select(Connection).where(
            Connection.user_id == user.id, Connection.provider == provider
        )
    )
    if conn is not None:
        conn.status = "not_connected"
        conn.connected_at = None
        db.commit()
    return list_providers(db=db, user=user)
