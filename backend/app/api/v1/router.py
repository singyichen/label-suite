"""Aggregates all v1 feature-module routers under the `/api/v1` prefix.

`app/main.py`'s app factory mounts this single router rather than each
module router individually, so adding a new module only requires one
`include_router` call here.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.modules.health.router import router as health_router

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(health_router)
