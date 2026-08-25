"""Tests for the assembled app (`app/main.py`) and the health endpoint.

Covers the canonical "Health check 端點" requirement
(specs/foundation/000-foundation/spec.md:73-82; FR-002, FR-004, FR-007,
FR-070):

- `GET /api/v1/health` is public/unauthenticated and returns `200` with a
  `HealthResponse` body (`status`, `version`).
- The response carries `X-Correlation-ID`, proving `CorrelationIdMiddleware`
  (PR-FOUND-BE3) is wired into the assembled app, not just defined.
- A validation failure on the assembled app serializes to the shared
  `ErrorResponse` envelope (SC-035), proving `register_exception_handlers`
  is wired in. The health route itself takes no parameters, so a throwaway
  validated route is mounted onto the app instance inside the relevant test
  to provoke a 422 — preferred over adding a fake production route.
- In production with `ENABLE_OPENAPI_DOCS` unset, `/docs`, `/redoc`, and
  `/openapi.json` are not served (FR-070); outside production they are.
"""

from __future__ import annotations

import re
import uuid
from pathlib import Path

from fastapi.testclient import TestClient
from pydantic import BaseModel

from app.core.config import Settings
from app.main import create_app
from app.middleware.correlation import CORRELATION_ID_HEADER
from app.schemas.common import ErrorResponse, HealthResponse


def _settings(**overrides: object) -> Settings:
    """Build an isolated `Settings` instance for a single test.

    Args:
        **overrides: Field overrides layered on top of a valid,
            non-production baseline (`environment="local"`, an explicit
            `allowed_origins`).

    Returns:
        A `Settings` instance built only from explicit constructor
        arguments. `_env_file=None` keeps a stray local `.env` file from
        leaking into the test (this has bitten this project before).
    """
    fields: dict[str, object] = {
        "environment": "local",
        "allowed_origins": ["http://localhost:5173"],
    }
    fields.update(overrides)
    return Settings(_env_file=None, **fields)  # type: ignore[arg-type]


def _health_route_path() -> str:
    """Return the path the assembled app actually serves the health endpoint on.

    Returns:
        The single OpenAPI path ending in `/health`, so callers can anchor
        assertions to the live route rather than a hardcoded literal.
    """
    schema = create_app(settings=_settings()).openapi()
    paths = [path for path in schema["paths"] if path.endswith("/health")]
    assert len(paths) == 1
    return str(paths[0])


def test_bruno_collection_describes_the_live_health_request() -> None:
    """The Bruno collection stays in sync with the route it documents (FR-131).

    `tasks.md` task 4.3 verifies this file by hand. Without an executable
    assertion, renaming the route or gutting the example response would
    leave the collection silently rotten while CI stayed green.
    """
    bru_path = (
        Path(__file__).resolve().parents[2] / "bruno/foundation/000-foundation/get-health.bru"
    )
    contents = bru_path.read_text(encoding="utf-8")

    # Anchored to the path the app actually serves, so renaming the route
    # fails here instead of drifting away from the collection. Matched as a
    # whole line, not a substring: `in` would accept `/health` inside a
    # `/healthz` URL.
    url_line = r"^\s*url:\s*\{\{baseUrl\}\}" + re.escape(_health_route_path()) + r"\s*$"
    assert re.search(url_line, contents, re.MULTILINE)

    # Task 4.3 requires an example response. Assert it really is a
    # `HealthResponse` payload, not prose that merely names the fields.
    examples = []
    for candidate in re.findall(r"\{[^{}]*\}", contents):
        try:
            examples.append(HealthResponse.model_validate_json(candidate))
        except ValueError:
            continue

    assert examples


def test_health_endpoint_returns_ok_status_and_version() -> None:
    """`GET /api/v1/health` returns 200 with a `HealthResponse` body."""
    client = TestClient(create_app(settings=_settings()))

    response = client.get("/api/v1/health")

    assert response.status_code == 200
    parsed = HealthResponse.model_validate(response.json())
    assert parsed.status == "ok"
    assert parsed.version


def test_health_response_carries_a_correlation_id_header() -> None:
    """The assembled app has `CorrelationIdMiddleware` wired in, not just defined."""
    client = TestClient(create_app(settings=_settings()))

    response = client.get("/api/v1/health")

    correlation_id = response.headers[CORRELATION_ID_HEADER]
    assert uuid.UUID(correlation_id).version == 4


def test_correlation_id_header_is_exposed_to_cross_origin_callers() -> None:
    """`X-Correlation-ID` is readable by the browser, not just present on the wire.

    `X-Correlation-ID` is not a CORS-safelisted response header, so a
    cross-origin caller gets `null` from `response.headers.get(...)` unless
    the server lists it in `Access-Control-Expose-Headers`. Without this the
    frontend `api-client`'s correlation-id propagation silently degrades to
    `null` in every real browser call while still passing its own tests.
    """
    origin = "http://localhost:5173"
    client = TestClient(create_app(settings=_settings(allowed_origins=[origin])))

    response = client.get("/api/v1/health", headers={"Origin": origin})

    exposed = response.headers["Access-Control-Expose-Headers"]
    assert CORRELATION_ID_HEADER in [header.strip() for header in exposed.split(",")]


def test_validation_error_on_assembled_app_uses_error_response_envelope() -> None:
    """The assembled app has `register_exception_handlers` wired in (SC-035).

    The health route takes no parameters, so a throwaway route with a
    validated body is mounted onto the app instance here to provoke a 422 —
    legitimate and preferred over adding a fake production route.
    """
    app = create_app(settings=_settings())

    class _ValidatedPayload(BaseModel):
        count: int

    @app.post("/__test-only/validate")
    def _validate(payload: _ValidatedPayload) -> dict[str, int]:
        return {"count": payload.count}

    client = TestClient(app)
    response = client.post("/__test-only/validate", json={"count": "not-an-int"})

    assert response.status_code == 422
    parsed = ErrorResponse.model_validate(response.json())
    assert isinstance(parsed.detail, list)
    assert parsed.detail[0].loc is not None


class TestOpenApiDocsToggle:
    """FR-070: docs served outside production, hidden in production by default."""

    def test_docs_not_served_in_production_without_explicit_override(self) -> None:
        client = TestClient(
            create_app(
                settings=_settings(
                    environment="production",
                    allowed_origins=["https://app.example.com"],
                )
            )
        )

        assert client.get("/docs").status_code == 404
        assert client.get("/redoc").status_code == 404
        assert client.get("/openapi.json").status_code == 404

    def test_docs_served_outside_production(self) -> None:
        client = TestClient(create_app(settings=_settings(environment="local")))

        assert client.get("/docs").status_code == 200
        assert client.get("/redoc").status_code == 200
        assert client.get("/openapi.json").status_code == 200
