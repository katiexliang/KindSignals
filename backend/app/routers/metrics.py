"""Metrics endpoints powering the Health Dashboard."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import MetricsSummary, MetricsTrends
from app.services.metrics_service import build_summary, build_trends
from app.services.auth import get_current_user
from app.models import User

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/summary", response_model=MetricsSummary)
def metrics_summary(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> MetricsSummary:
    """Latest values, personal baselines, coverage, and recent symptoms."""
    return build_summary(db, user)


@router.get("/trends", response_model=MetricsTrends)
def metrics_trends(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> MetricsTrends:
    """Per-metric daily series over the window. Gaps are null, not zero."""
    return build_trends(db, user)
