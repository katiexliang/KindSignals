"""Shared pytest fixtures: an isolated in-memory database per test module.

Tests must not touch the developer's real `kindsignals.db`. We point the app at
a temporary SQLite file, create the schema, seed it, and override the FastAPI
`get_db` dependency.
"""

from __future__ import annotations

import os
import tempfile
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker


@pytest.fixture(scope="session")
def _test_db_url() -> Generator[str, None, None]:
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    url = f"sqlite:///{path}"
    yield url
    try:
        os.remove(path)
    except OSError:
        pass


@pytest.fixture(scope="session")
def seeded_engine(_test_db_url: str):
    from app.database import Base
    from app.data.synthetic import generate_dataset
    from app.models import DailyMetric, JournalEntry, User
    from datetime import date

    engine = create_engine(_test_db_url, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    SessionTest = sessionmaker(bind=engine)

    with SessionTest() as db:
        user = User(
            email="test@kindsignals.local",
            password_hash="x",  # not used; tests override auth directly
            name="Livie Demo",
            birthdate=date(2001, 3, 14),
            diagnosis="pcos_pmos",
            contraception_method="none",
            is_demo=True,
        )
        db.add(user)
        db.flush()
        ds = generate_dataset()
        for m in ds.metrics:
            db.add(DailyMetric(user_id=user.id, date=m.date,
                recovery_score=m.recovery_score, resting_hr=m.resting_hr,
                hrv_ms=m.hrv_ms, sleep_duration_min=m.sleep_duration_min,
                sleep_efficiency_pct=m.sleep_efficiency_pct, strain=m.strain,
                source=m.source, is_synthetic=m.is_synthetic))
        for j in ds.journals:
            db.add(JournalEntry(user_id=user.id, date=j.date,
                menstrual_flow=j.menstrual_flow, fatigue=j.fatigue, mood=j.mood,
                stress=j.stress, acne=j.acne, sleep_quality=j.sleep_quality,
                lifestyle_factors=j.lifestyle_factors, is_synthetic=j.is_synthetic))
        db.commit()

    return engine, SessionTest


@pytest.fixture()
def db_session(seeded_engine) -> Generator[Session, None, None]:
    _, SessionTest = seeded_engine
    db = SessionTest()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client(seeded_engine) -> Generator[TestClient, None, None]:
    _, SessionTest = seeded_engine
    from app.database import get_db
    from app.main import app
    from app.models import User
    from app.services.auth import get_current_user
    from sqlalchemy import select

    def _override() -> Generator[Session, None, None]:
        db = SessionTest()
        try:
            yield db
        finally:
            db.close()

    def _current_user() -> User:
        db = SessionTest()
        try:
            return db.scalar(select(User).order_by(User.id.asc()).limit(1))
        finally:
            db.close()

    app.dependency_overrides[get_db] = _override
    app.dependency_overrides[get_current_user] = _current_user
    yield TestClient(app)
    app.dependency_overrides.clear()
