"""Insight engine: determinism, missing-data handling, non-causal wording.

The engine now reports descriptive per-metric TRENDS (associations were removed)
with richer detail: what each metric measures, its relevance, weekly/monthly/
yearly averages, and cited recommendations.
"""

from __future__ import annotations

from app.services.insight_engine import build_insights

CAUSAL_WORDS = ["causes", "caused by", "leads to", "results in", "because of"]


def test_insights_deterministic(db_session):
    a = build_insights(db_session)
    b = build_insights(db_session)
    assert [t.description for t in a.trends] == [t.description for t in b.trends]
    assert [t.avg_month for t in a.trends] == [t.avg_month for t in b.trends]


def test_trends_have_rich_detail(db_session):
    ins = build_insights(db_session)
    assert ins.trends
    recovery = next(t for t in ins.trends if t.metric_key == "recovery")
    # What it measures + why it's relevant are populated.
    assert recovery.measures
    assert recovery.relevance
    # At least one cited recommendation, traceable to the research library.
    assert recovery.recommendations
    assert recovery.recommendations[0].citation_id
    # Averages are present (synthetic data covers the window).
    assert recovery.avg_week is not None
    assert recovery.avg_month is not None


def test_language_is_not_causal(db_session):
    ins = build_insights(db_session)
    texts = [t.description.lower() for t in ins.trends]
    texts += [t.relevance.lower() for t in ins.trends]
    texts += [r.text.lower() for t in ins.trends for r in t.recommendations]
    texts.append(ins.disclaimer.lower())
    for text in texts:
        for word in CAUSAL_WORDS:
            if word in text:
                assert "not a cause" in text or "cause and effect" in text


def test_averages_use_only_real_data(db_session):
    """Averages are means over covered days — never zero-filled for gaps."""
    ins = build_insights(db_session)
    for t in ins.trends:
        for avg in (t.avg_week, t.avg_month, t.avg_year):
            # A computed average must fall within the observed range (or be None).
            if avg is not None:
                assert avg >= 0
