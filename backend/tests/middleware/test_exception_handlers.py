"""Tests for `app.middleware.exception_handlers` — unified `ErrorResponse` envelope.

Covers the canonical "統一 API 錯誤 envelope" requirement (FR-002 / FR-115 /
FR-116; SC-035): FastAPI's built-in HTTP exception handler, Pydantic
validation errors, and application-level errors must all serialize to the
same `ErrorResponse` schema. The primary target of this task (per the
change spec delta) is the "應用程式錯誤使用 envelope" scenario
(`test_application_error_produces_error_response_envelope`); the
validation-error and HTTP-exception handlers are exercised too since they
are defined in this same module and required by SC-035's broader wording,
and by a later group's health-endpoint 422 test.
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from pydantic import BaseModel

from app.middleware.exception_handlers import AppError, register_exception_handlers
from app.schemas.common import ErrorResponse


class _TwoFieldPayload(BaseModel):
    """Request body with two typed fields, used to provoke two validation errors."""

    count: int
    ratio: float


def _build_app() -> FastAPI:
    """Build a throwaway app with the unified exception handlers registered.

    Returns:
        A minimal `FastAPI` app exposing routes that each raise a
        different exception type, for exercising each registered handler.
    """
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/app-error")
    def app_error_route() -> None:
        raise AppError(status_code=400, detail="bad request from application rule")

    @app.get("/http-error")
    def http_error_route() -> None:
        raise HTTPException(status_code=404, detail="not found")

    @app.get("/items/{item_id}")
    def get_item(item_id: int) -> dict[str, int]:
        return {"item_id": item_id}

    @app.post("/items")
    def create_item(payload: _TwoFieldPayload) -> dict[str, int]:
        return {"count": payload.count}

    @app.get("/boom")
    def boom_route() -> None:
        raise RuntimeError("an unregistered exception type escaped the route")

    return app


def test_application_error_produces_error_response_envelope() -> None:
    """A custom `AppError` yields an `ErrorResponse` body, not FastAPI's default shape (SC-035)."""
    client = TestClient(_build_app())

    response = client.get("/app-error")

    assert response.status_code == 400
    parsed = ErrorResponse.model_validate(response.json())
    assert parsed.detail == "bad request from application rule"


def test_http_exception_produces_error_response_envelope() -> None:
    """A raised `HTTPException` also serializes to the shared `ErrorResponse` schema."""
    client = TestClient(_build_app())

    response = client.get("/http-error")

    assert response.status_code == 404
    parsed = ErrorResponse.model_validate(response.json())
    assert parsed.detail == "not found"


def test_validation_error_produces_error_response_envelope() -> None:
    """A Pydantic validation error serializes to `ErrorResponse` with `ErrorDetail` items."""
    client = TestClient(_build_app())

    response = client.get("/items/not-an-int")

    assert response.status_code == 422
    parsed = ErrorResponse.model_validate(response.json())
    assert isinstance(parsed.detail, list)
    assert parsed.detail[0].loc is not None
    assert parsed.detail[0].error_code is None


def test_every_validation_detail_entry_carries_loc_msg_and_type() -> None:
    """The scenario's plural "各項" holds: *every* entry carries `loc`/`msg`/`type`.

    The single-error case above cannot prove a per-item guarantee, so this
    drives a body that fails validation on two fields at once.
    """
    client = TestClient(_build_app())

    response = client.post("/items", json={"count": "not-an-int", "ratio": "not-a-float"})

    assert response.status_code == 422
    parsed = ErrorResponse.model_validate(response.json())
    assert isinstance(parsed.detail, list)
    assert len(parsed.detail) == 2
    for entry in parsed.detail:
        assert entry.loc
        assert entry.msg
        assert entry.type


def test_unregistered_exception_produces_error_response_envelope() -> None:
    """An exception with no dedicated handler still yields the shared envelope.

    Without a catch-all, an application bug escapes to Starlette's
    `ServerErrorMiddleware` and returns `text/plain` "Internal Server
    Error" — the exact default shape SC-035 forbids.
    """
    client = TestClient(_build_app(), raise_server_exceptions=False)

    response = client.get("/boom")

    assert response.status_code == 500
    assert response.headers["content-type"].startswith("application/json")
    ErrorResponse.model_validate(response.json())


def test_unregistered_exception_does_not_leak_internals() -> None:
    """The 500 envelope must not echo the exception message back to the client."""
    client = TestClient(_build_app(), raise_server_exceptions=False)

    response = client.get("/boom")

    assert "unregistered exception type escaped" not in response.text
