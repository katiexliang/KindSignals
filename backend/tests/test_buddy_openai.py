"""Grounded OpenAI provider: fabricated citations must be stripped.

We don't call the real API — we monkeypatch the OpenAI client to return a reply
that includes a made-up citation id, and assert it never reaches the response.
"""

from __future__ import annotations

import json
import sys
import types

from app.services.buddy import OpenAIProvider


class _FakeMessage:
    def __init__(self, content): self.content = content


class _FakeChoice:
    def __init__(self, content): self.message = _FakeMessage(content)


class _FakeCompletion:
    def __init__(self, content): self.choices = [_FakeChoice(content)]


def _install_fake_openai(monkeypatch, payload: dict):
    """Install a fake `openai` module whose client returns `payload` as JSON."""
    fake = types.ModuleType("openai")

    class _Client:
        def __init__(self, *a, **k):
            self.chat = types.SimpleNamespace(
                completions=types.SimpleNamespace(
                    create=lambda **kw: _FakeCompletion(json.dumps(payload))
                )
            )

    fake.OpenAI = _Client
    monkeypatch.setitem(sys.modules, "openai", fake)


def test_fabricated_citations_are_dropped(db_session, monkeypatch):
    _install_fake_openai(
        monkeypatch,
        {
            "greeting": "Hi!",
            "personal_observations": ["Your recovery was steady."],
            "scientific_evidence": ["Sleep matters for recovery."],
            "uncertainty": ["This is descriptive."],
            "consider_next": ["Keep a steady sleep schedule."],
            "clinician_questions": ["Is my fatigue worth exploring?"],
            # One real id (exists in the curated library) + one fabricated id.
            "citation_ids": ["fernandez2018", "totally-made-up-2099"],
        },
    )

    from app.services.users import get_active_user

    provider = OpenAIProvider(api_key="test", model="gpt-4o-mini")
    user = get_active_user(db_session)
    resp = provider.generate(db_session, "why am I tired?", user)

    ids = {c.id for c in resp.citations}
    assert "fernandez2018" in ids  # real one kept
    assert "totally-made-up-2099" not in ids  # fabricated one stripped
    assert all(c.id for c in resp.citations)
