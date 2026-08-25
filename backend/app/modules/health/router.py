"""Health check endpoint (`GET /api/v1/health`).

Implements the canonical "Health check 端點" requirement (FR-002, FR-004,
FR-007, FR-070): a public, unauthenticated endpoint mounted from a module
package's own `APIRouter`, not defined inline in `app/main.py`.

This module contains only a router — no `service.py` / `repository.py`.
There is no business logic to orchestrate (design.md Decision 6); adding
empty service/repository layers would violate Simplicity First.
"""

from __future__ import annotations

from importlib.metadata import version

from fastapi import APIRouter

from app.schemas.common import HealthResponse

router = APIRouter(tags=["health"])

#: Application version, read from installed distribution metadata (matching
#: `pyproject.toml`'s `[project].version`) rather than hardcoded.
_APP_VERSION = version("label-suite-backend")


@router.get("/health", response_model=HealthResponse)
async def get_health() -> HealthResponse:
    """Report service health for uptime checks and smoke tests.

    Returns:
        `HealthResponse` with a static `"ok"` status and the running
        application version.
    """
    return HealthResponse(status="ok", version=_APP_VERSION)
