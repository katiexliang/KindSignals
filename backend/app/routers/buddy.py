"""PMOS Buddy endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import BuddyAsk, BuddyResponse
from app.services.buddy import get_provider
from app.services.auth import get_current_user
from app.models import User

router = APIRouter(prefix="/buddy", tags=["buddy"])


@router.post("/ask", response_model=BuddyResponse)
def ask(payload: BuddyAsk, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> BuddyResponse:
    """Answer an educational question, grounded in the user's data + research."""
    provider = get_provider()
    return provider.generate(db, payload.question, user, payload.history)
