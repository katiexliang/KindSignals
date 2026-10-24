"""Health-check endpoint used by the frontend to confirm connectivity."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

from app.config import settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    """Report that the backend is up and reachable."""
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.app_version,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "demo_mode": True,
    }
