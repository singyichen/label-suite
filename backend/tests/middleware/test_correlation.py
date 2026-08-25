"""Tests for `app.middleware.correlation` — per-request correlation ID.

Covers the two scenarios of the canonical "請求關聯" requirement (回應帶關聯 ID /
日誌帶關聯 ID; FR-046) plus the structured logging field set required by
FR-047, exercised against a throwaway `FastAPI()` app built only for this
test module.
"""

from __future__ import annotations

import json
import logging
import uuid

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.middleware.correlation import (
    CORRELATION_ID_HEADER,
    CorrelationIdMiddleware,
    JsonLogFormatter,
)
from app.middleware.exception_handlers import register_exception_handlers


def _build_app() -> FastAPI:
    """Build a throwaway app with the correlation middleware and handlers attached.

    Mirrors the wiring a later group's app factory will perform, so the
    failure path can be exercised: without the registered handlers, an
    unhandled exception bypasses the middleware's post-processing entirely.

    Returns:
        A minimal `FastAPI` app exposing `GET /ping` and `GET /boom`.
    """
    app = FastAPI()
    app.add_middleware(CorrelationIdMiddleware)
    register_exception_handlers(app)

    @app.get("/ping")
    def ping() -> dict[str, str]:
        return {"pong": "ok"}

    @app.get("/boom")
    def boom() -> None:
        raise RuntimeError("kaboom")

    return app


def test_response_carries_a_uuid_v4_correlation_id() -> None:
    """Every response carries an `X-Correlation-ID` header with a UUID v4 value."""
    client = TestClient(_build_app())

    response = client.get("/ping")

    correlation_id = response.headers[CORRELATION_ID_HEADER]
    assert uuid.UUID(correlation_id).version == 4


def test_two_requests_get_different_correlation_ids() -> None:
    """Each request is assigned a freshly generated correlation ID, not reused."""
    client = TestClient(_build_app())

    first = client.get("/ping").headers[CORRELATION_ID_HEADER]
    second = client.get("/ping").headers[CORRELATION_ID_HEADER]

    assert first != second


def test_request_log_record_carries_the_same_correlation_id(
    caplog: pytest.LogCaptureFixture,
) -> None:
    """The request log record's `correlation_id` matches the response header."""
    caplog.set_level(logging.INFO, logger="app.request")
    client = TestClient(_build_app())

    response = client.get("/ping")

    log_record = next(record for record in caplog.records if record.name == "app.request")
    assert log_record.correlation_id == response.headers[CORRELATION_ID_HEADER]  # type: ignore[attr-defined]


def test_failed_request_still_carries_a_correlation_id(
    caplog: pytest.LogCaptureFixture,
) -> None:
    """FR-046 says *every* request — a 500 is the case where the ID matters most.

    An exception with no dedicated handler must still reach the client
    tagged with `X-Correlation-ID`, and must still produce a log record
    carrying that same ID, or a user reporting "it broke" hands support an
    ID that appears in no log line.
    """
    caplog.set_level(logging.INFO, logger="app.request")
    client = TestClient(_build_app(), raise_server_exceptions=False)

    response = client.get("/boom")

    assert response.status_code == 500
    correlation_id = response.headers[CORRELATION_ID_HEADER]
    assert uuid.UUID(correlation_id).version == 4

    log_record = next(record for record in caplog.records if record.name == "app.request")
    assert log_record.correlation_id == correlation_id  # type: ignore[attr-defined]


def test_json_log_formatter_defaults_missing_context_fields_to_null() -> None:
    """A record logged without correlation context still emits the full field set.

    `JsonLogFormatter` is attached to a logger, not to a single call site,
    so it will format records that never went through the middleware.
    """
    record = logging.LogRecord(
        name="app.other",
        level=logging.WARNING,
        pathname=__file__,
        lineno=1,
        msg="no correlation context here",
        args=(),
        exc_info=None,
    )

    payload = json.loads(JsonLogFormatter().format(record))

    assert payload["correlation_id"] is None
    assert payload["user_id"] is None
    assert payload["level"] == "WARNING"


def test_json_log_formatter_emits_required_structured_fields() -> None:
    """The JSON formatter emits timestamp/level/correlation_id/user_id/message (FR-047)."""
    record = logging.LogRecord(
        name="app.request",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="request completed",
        args=(),
        exc_info=None,
    )
    record.correlation_id = "test-correlation-id"
    record.user_id = None

    payload = json.loads(JsonLogFormatter().format(record))

    assert payload.keys() >= {"timestamp", "level", "correlation_id", "user_id", "message"}
    assert payload["correlation_id"] == "test-correlation-id"
    assert payload["level"] == "INFO"
    assert payload["user_id"] is None
    assert payload["message"] == "request completed"
