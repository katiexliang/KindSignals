"""KindSignals FastAPI application entry point.

Mounts all feature routers under the `/api` prefix and configures CORS for the
Vite dev frontend. Feature routers are added as their tasks are implemented.
"""

from __future__ import annotations

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import (
    auth,
    buddy,
    connections,
    health,
    insights,
    journal,
    metrics,
    summary,
    user,
)

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Understand your signals. Navigate your health.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# All API routes live under /api.
api = APIRouter(prefix="/api")
api.include_router(health.router)
api.include_router(metrics.router)
api.include_router(journal.router)
api.include_router(insights.router)
api.include_router(buddy.router)
api.include_router(summary.router)
api.include_router(user.router)
api.include_router(auth.router)
api.include_router(connections.router)

app.include_router(api)


@app.get("/")
def root() -> dict:
    """Friendly root so hitting the backend directly isn't a 404."""
    return {
        "service": settings.app_name,
        "tagline": "Understand your signals. Navigate your health.",
        "docs": "/docs",
        "health": "/api/health",
    }
