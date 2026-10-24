"""Synthetic generator: reproducibility, labeling, gaps, embedded pattern.

Covers Requirements 2.2, 2.3, 2.4, 2.5, 2.6.
"""

from __future__ import annotations

import pandas as pd

from app.data.synthetic import DAYS, generate_dataset


def test_is_deterministic():
    a = generate_dataset()
    b = generate_dataset()
    assert [m.recovery_score for m in a.metrics] == [
        m.recovery_score for m in b.metrics
    ]
    assert [j.fatigue for j in a.journals] == [j.fatigue for j in b.journals]


def test_day_count_and_labels():
    ds = generate_dataset()
    assert len(ds.metrics) == DAYS
    assert all(m.is_synthetic and m.source == "synthetic" for m in ds.metrics)
    assert all(j.is_synthetic for j in ds.journals)


def test_has_intentional_gaps():
    ds = generate_dataset()
    # Some whole journal days are missing.
    assert len(ds.journals) < DAYS
    # Some metric fields are missing (None), not zero-filled.
    missing_recovery = sum(1 for m in ds.metrics if m.recovery_score is None)
    assert missing_recovery > 0


def test_embedded_fatigue_recovery_pattern():
    ds = generate_dataset()
    recovery_by_date = {m.date: m.recovery_score for m in ds.metrics}
    pairs = [
        (j.fatigue, recovery_by_date.get(j.date))
        for j in ds.journals
        if j.fatigue is not None and recovery_by_date.get(j.date) is not None
    ]
    df = pd.DataFrame(pairs, columns=["fatigue", "recovery"])
    assert len(df) >= 20
    r = df["fatigue"].corr(df["recovery"])
    # Reproducible, clearly negative descriptive association.
    assert r < -0.3
