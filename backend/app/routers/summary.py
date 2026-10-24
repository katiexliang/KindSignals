"""Clinician-ready summary PDF endpoint."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.pdf_service import generate_summary_pdf
from app.services.auth import get_current_user
from app.models import User

router = APIRouter(prefix="/summary", tags=["summary"])


@router.get("/pdf")
def summary_pdf(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Response:
    """Generate and download the one-page clinician-ready summary PDF."""
    try:
        pdf_bytes = generate_summary_pdf(db, user)
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(
            status_code=500, detail=f"Could not generate summary PDF: {exc}"
        ) from exc

    filename = _download_filename(user)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _download_filename(user) -> str:
    """Build `kindsignals_<FirstInitial><LastName>_<YYYY-MM-DD>.pdf`.

    Falls back gracefully when the name has only one part or none.
    """
    parts = (user.name or "").strip().split()
    if len(parts) >= 2:
        person = f"{parts[0][0]}{parts[-1]}"
    elif len(parts) == 1:
        person = parts[0]
    else:
        person = "user"
    # Keep only safe filename characters.
    person = "".join(c for c in person if c.isalnum())
    return f"kindsignals_{person}_{date.today().isoformat()}.pdf"
