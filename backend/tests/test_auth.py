"""Auth + multi-user isolation tests.

Each email is a distinct account. Signup provisions synthetic data. Protected
endpoints require a valid Bearer token. One user cannot see another's journal.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def raw_client(seeded_engine):
    """Client WITHOUT the auth override — exercises the real token flow."""
    _, SessionTest = seeded_engine
    from app.database import get_db
    from app.main import app

    def _override():
        db = SessionTest()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _override
    yield TestClient(app)
    app.dependency_overrides.clear()


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_protected_endpoint_requires_token(raw_client):
    assert raw_client.get("/api/metrics/summary").status_code == 401


def test_signup_then_onboarding_attaches_data(raw_client):
    r = raw_client.post(
        "/api/auth/signup",
        json={"email": "alice@example.com", "password": "secret123"},
    )
    assert r.status_code == 201
    body = r.json()
    token = body["token"]
    assert body["user"]["is_demo"] is False
    assert body["user"]["onboarding_complete"] is False

    # Before onboarding, the new user has no wearable data.
    pre = raw_client.get("/api/metrics/summary", headers=_auth(token))
    assert pre.status_code == 200
    assert pre.json()["total_days"] == 0

    # Onboarding with WHOOP connect attaches their own synthetic dataset.
    onb = raw_client.post(
        "/api/auth/onboarding",
        json={
            "birthdate": "2000-01-01",
            "diagnosis": "pcos_pmos",
            "contraception_method": "pill",
            "connect_whoop": True,
            "connect_health": False,
        },
        headers=_auth(token),
    )
    assert onb.status_code == 200
    assert onb.json()["onboarding_complete"] is True

    post = raw_client.get("/api/metrics/summary", headers=_auth(token))
    assert post.json()["total_days"] > 0


def test_duplicate_email_rejected(raw_client):
    raw_client.post(
        "/api/auth/signup",
        json={"email": "dup@example.com", "password": "secret123"},
    )
    again = raw_client.post(
        "/api/auth/signup",
        json={"email": "dup@example.com", "password": "secret123"},
    )
    assert again.status_code == 409


def test_login_and_wrong_password(raw_client):
    raw_client.post(
        "/api/auth/signup",
        json={"email": "bob@example.com", "password": "secret123"},
    )
    ok = raw_client.post(
        "/api/auth/login",
        json={"email": "bob@example.com", "password": "secret123"},
    )
    assert ok.status_code == 200
    bad = raw_client.post(
        "/api/auth/login",
        json={"email": "bob@example.com", "password": "wrong"},
    )
    assert bad.status_code == 401


def test_journal_is_isolated_per_user(raw_client):
    # Two separate accounts.
    a = raw_client.post(
        "/api/auth/signup",
        json={"email": "carol@example.com", "password": "secret123"},
    ).json()["token"]
    b = raw_client.post(
        "/api/auth/signup",
        json={"email": "dave@example.com", "password": "secret123"},
    ).json()["token"]

    # Carol writes a journal entry.
    raw_client.post(
        "/api/journal",
        json={"date": "2026-03-01", "mood": 4},
        headers=_auth(a),
    )
    carol_dates = {e["date"] for e in raw_client.get("/api/journal", headers=_auth(a)).json()}
    dave_dates = {e["date"] for e in raw_client.get("/api/journal", headers=_auth(b)).json()}
    assert "2026-03-01" in carol_dates
    assert "2026-03-01" not in dave_dates  # isolation


def test_delete_account_removes_user_and_data(raw_client):
    tok = raw_client.post(
        "/api/auth/signup",
        json={"email": "erin@example.com", "password": "secret123"},
    ).json()["token"]
    # Give them data via onboarding.
    raw_client.post(
        "/api/auth/onboarding",
        json={"diagnosis": "none", "contraception_method": "none", "connect_whoop": True},
        headers=_auth(tok),
    )
    assert raw_client.get("/api/metrics/summary", headers=_auth(tok)).json()["total_days"] > 0

    # Delete the account.
    r = raw_client.request("DELETE", "/api/user", headers=_auth(tok))
    assert r.status_code == 204

    # The token no longer resolves to a user.
    assert raw_client.get("/api/user", headers=_auth(tok)).status_code == 401
