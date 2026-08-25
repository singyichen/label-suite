"""FastAPI application factory.

Wires together everything the earlier Foundation-Core groups defined but
never attached to a live application: `Settings`, CORS, correlation-ID
middleware, the unified `ErrorResponse` exception handlers, the `/api/v1`
router tree, and the `ENABLE_OPENAPI_DOCS` toggle (FR-070).

Deliberately exposes only the `create_app` factory — no module-level
`app = create_app()` instance. `Settings()` construction fails fast when
required environment variables (e.g. `ALLOWED_ORIGINS`) are missing
(FR-022), which is correct at process startup but would make importing this
module for its factory function fail whenever those variables are not set
in the current environment (e.g. plain `uv run pytest`). Running the
server for real uses `uvicorn app.main:create_app --factory`, which only
evaluates `get_settings()` when the server actually starts.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_v1_router
from app.core.config import Settings, get_settings
from app.middleware import CorrelationIdMiddleware, register_exception_handlers


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build and wire the FastAPI application.

    Args:
        settings: Explicit settings to assemble the app with. Defaults to
            `get_settings()` (the process-wide cached instance) when not
            provided, so tests can pass an isolated `Settings` instance
            without touching global `lru_cache` state.

    Returns:
        A fully wired `FastAPI` application instance. `debug` is never set
        to `True`: Starlette's `ServerErrorMiddleware` returns its own HTML
        traceback page under `debug=True` without consulting registered
        exception handlers, silently defeating the `ErrorResponse` envelope
        and the `X-Correlation-ID` header on unhandled 500s (SC-035).
    """
    resolved_settings = settings if settings is not None else get_settings()
    docs_enabled = resolved_settings.enable_openapi_docs

    app = FastAPI(
        title="Label Suite API",
        docs_url="/docs" if docs_enabled else None,
        redoc_url="/redoc" if docs_enabled else None,
        openapi_url="/openapi.json" if docs_enabled else None,
    )

    # `allow_credentials` is left at its `False` default: nothing here sets
    # a cookie or reads an `Authorization` header yet, so enabling it now
    # would pre-authorize credentialed cross-origin requests for a
    # mechanism that does not exist. The module that introduces
    # cookie-based sessions (account/001, ADR-021) turns it on alongside
    # tests that actually exercise it.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=resolved_settings.allowed_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(CorrelationIdMiddleware)
    register_exception_handlers(app)
    app.include_router(api_v1_router)

    return app
