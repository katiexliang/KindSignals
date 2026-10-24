"""Clinician-Ready Health Summary — one-page PDF via ReportLab.

The document is explicitly labeled patient-generated information (not a medical
assessment), labels synthetic/demo data, and includes a data-limitations
section. Clinician prompts are framed as questions to ask, never conclusions.
"""

from __future__ import annotations

from datetime import date
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import JournalEntry
from app.services.insight_engine import build_insights
from app.services.metrics_service import build_summary
from app.services.users import get_active_user
from app.schemas import _age_from_birthdate
from app.services.whoop_adapter import get_default_source

def _dx_label(dx: str | None) -> str:
    return {"pcos_pmos": "PCOS / PMOS", "none": "No diagnosis noted"}.get(dx or "none", dx or "—")


BRAND = colors.HexColor("#206e74")
MUTED = colors.HexColor("#64748b")
ACCENT = colors.HexColor("#8872d9")


def _styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "ks_title", parent=base["Title"], fontSize=18, textColor=BRAND,
            spaceAfter=2, alignment=TA_LEFT,
        ),
        "tagline": ParagraphStyle(
            "ks_tagline", parent=base["Normal"], fontSize=9, textColor=MUTED,
            spaceAfter=6,
        ),
        "banner": ParagraphStyle(
            "ks_banner", parent=base["Normal"], fontSize=8, textColor=colors.white,
            backColor=ACCENT, borderPadding=4, spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "ks_h2", parent=base["Heading2"], fontSize=10.5, textColor=BRAND,
            spaceBefore=6, spaceAfter=2,
        ),
        "body": ParagraphStyle(
            "ks_body", parent=base["Normal"], fontSize=8.5, leading=11,
        ),
        "small": ParagraphStyle(
            "ks_small", parent=base["Normal"], fontSize=7.5, leading=9,
            textColor=MUTED,
        ),
    }


def _fmt(value: float | None, unit: str = "") -> str:
    if value is None:
        return "—"
    return f"{value}{unit}"


def generate_summary_pdf(db: Session, user=None) -> bytes:
    user = user or get_active_user(db)
    source = get_default_source(db)
    summary = build_summary(db, user)
    insights = build_insights(db, user)

    entries = db.scalars(
        select(JournalEntry)
        .where(JournalEntry.user_id == user.id)
        .order_by(JournalEntry.date.desc())
    ).all()

    st = _styles()
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=letter,
        leftMargin=0.6 * inch, rightMargin=0.6 * inch,
        topMargin=0.5 * inch, bottomMargin=0.5 * inch,
        title="KindSignals Clinician-Ready Health Summary",
    )
    flow: list = []

    # Header + mandatory banner.
    flow.append(Paragraph("KindSignals — Health Summary", st["title"]))
    flow.append(Paragraph("Understand your signals. Navigate your health.", st["tagline"]))
    flow.append(
        Paragraph(
            "PATIENT-GENERATED INFORMATION — NOT A MEDICAL ASSESSMENT, DIAGNOSIS, "
            "OR TREATMENT. For discussion with a healthcare professional.",
            st["banner"],
        )
    )
    if source.is_synthetic:
        flow.append(
            Paragraph(
                f"Data source: {source.label}. All values below are synthetic "
                "demonstration data.",
                st["small"],
            )
        )
    flow.append(Spacer(1, 4))

    # Patient info + observation period (two-column table).
    window = (
        f"{summary.window_start} to {summary.window_end} "
        f"({summary.total_days} days)"
        if summary.window_start
        else "—"
    )
    info = Table(
        [
            ["Patient", user.name, "Age", str(_age_from_birthdate(user.birthdate) or "—")],
            ["Condition", _dx_label(user.diagnosis), "", ""],
            ["Observation period", window, "Generated", date.today().isoformat()],
        ],
        colWidths=[1.1 * inch, 2.5 * inch, 1.0 * inch, 1.6 * inch],
    )
    info.setStyle(
        TableStyle(
            [
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("TEXTCOLOR", (0, 0), (0, -1), MUTED),
                ("TEXTCOLOR", (2, 0), (2, -1), MUTED),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    flow.append(info)
    flow.append(Spacer(1, 4))
    flow.append(HRFlowable(width="100%", color=colors.HexColor("#e2e8f0")))

    # Wearable measurements table.
    flow.append(Paragraph("Wearable measurements (personal baselines)", st["h2"]))
    rows = [["Metric", "Latest", "Baseline", "Range", "Days / Coverage"]]
    for s in summary.stats:
        rng = (
            f"{_fmt(s.min)}–{_fmt(s.max)}"
            if s.min is not None and s.max is not None
            else "—"
        )
        rows.append(
            [
                s.label,
                _fmt(s.latest, s.unit or "" if s.unit == "%" else ""),
                _fmt(s.baseline),
                rng,
                f"{s.sample_size} / {s.coverage_pct}%",
            ]
        )
    mt = Table(rows, colWidths=[1.5 * inch, 1.0 * inch, 1.0 * inch, 1.3 * inch, 1.5 * inch])
    mt.setStyle(
        TableStyle(
            [
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eefcfb")),
                ("TEXTCOLOR", (0, 0), (-1, 0), BRAND),
                ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.HexColor("#cbd5e1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    flow.append(mt)

    # Verified trends + menstrual/symptom history (two columns of text).
    flow.append(Paragraph("Observed trends", st["h2"]))
    for t in insights.trends:
        if t.direction == "insufficient data":
            continue
        tag = " (low confidence)" if t.low_confidence else ""
        flow.append(Paragraph(f"• {t.description}{tag}", st["body"]))

    flow.append(Paragraph("Menstrual & symptom history (recent reported)", st["h2"]))
    recent_bits: list[str] = []
    for e in entries[:8]:
        parts = []
        if e.menstrual_flow:
            parts.append(f"flow {e.menstrual_flow}")
        for attr, lbl in (("fatigue", "fatigue"), ("mood", "mood"), ("stress", "stress"), ("acne", "acne")):
            v = getattr(e, attr)
            if v is not None:
                parts.append(f"{lbl} {v}/5")
        if parts:
            recent_bits.append(f"{e.date.isoformat()}: " + ", ".join(parts))
    flow.append(
        Paragraph(
            "; ".join(recent_bits) if recent_bits else "No symptoms reported in recent entries.",
            st["body"],
        )
    )

    # Data limitations (mandatory).
    flow.append(Paragraph("Data limitations", st["h2"]))
    flow.append(
        Paragraph(
            "Entries are voluntary and may be incomplete; blank days are treated "
            "as not reported, not as absence of symptoms. Relationships shown are "
            "descriptive correlations within this individual's own data over a "
            "short window and do not establish cause and effect. "
            + ("All data is synthetic demonstration data. " if source.is_synthetic else ""),
            st["body"],
        )
    )

    # Suggested clinician discussion questions.
    flow.append(Paragraph("Suggested questions for your clinician", st["h2"]))
    for q in [
        "Are the trends and patterns in this summary worth exploring further?",
        "Which lifestyle factors are most relevant to focus on for my profile?",
        "Are there assessments or follow-ups you would recommend?",
    ]:
        flow.append(Paragraph(f"• {q}", st["body"]))

    flow.append(Spacer(1, 6))
    flow.append(HRFlowable(width="100%", color=colors.HexColor("#e2e8f0")))
    flow.append(Paragraph(insights.disclaimer, st["small"]))

    doc.build(flow)
    return buf.getvalue()
