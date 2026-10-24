"""Endpoint integration tests for journal, buddy, and the summary PDF.

Covers Requirements 4.2-4.3, 6.1-6.6, 7.1-7.4.
"""

from __future__ import annotations


def test_journal_create_preserves_blanks(client):
    r = client.post(
        "/api/journal",
        json={"date": "2026-02-01", "fatigue": 3, "mood": None},
    )
    assert r.status_code == 201
    body = r.json()
    assert body["fatigue"] == 3
    assert body["mood"] is None  # blank stays null, not zero
    assert body["is_synthetic"] is False  # user entry is distinguishable


def test_buddy_is_grounded_and_cited(client):
    r = client.post(
        "/api/buddy/ask",
        json={"question": "Why am I so tired and how is my recovery?"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["personal_observations"]
    # Evidence prose is no longer surfaced in the chat; grounding is carried by
    # the curated citations, which must still be present.
    assert body["citations"]  # never fabricated; from curated library
    assert body["clinician_questions"]
    assert body["disclaimer"]


def test_summary_pdf_is_valid(client):
    r = client.get("/api/summary/pdf")
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert r.content[:4] == b"%PDF"
    assert len(r.content) > 2000
