"""Insights endpoint: descriptive trends and symptom/metric associations."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import DayInsightsResponse, InsightsResponse, SignalsSummary
from app.services.insight_engine import (
    build_day_insights,
    build_insights,
    build_signals_summary,
)
from app.services.auth import get_current_user
from app.models import User

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("", response_model=InsightsResponse)
def get_insights(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> InsightsResponse:
    """Transparent, descriptive insights with sample size, coverage, and limits."""
    return build_insights(db, user)


@router.get("/days", response_model=DayInsightsResponse)
def get_day_insights(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> DayInsightsResponse:
    """Per-day descriptive insights from each day's wearable + journal data."""
    return build_day_insights(db, user)


@router.get("/signals-summary", response_model=SignalsSummary)
def get_signals_summary(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> SignalsSummary:
    """Summary of how the user's wearable signals connect to PCOS/PMOS."""
    return build_signals_summary(db, user)
