"""Unified FastAPI exception handlers emitting the shared `ErrorResponse` envelope.

Implements the canonical "統一 API 錯誤 envelope" requirement (FR-002 /
FR-115 / FR-116; SC-035): FastAPI's built-in HTTP exception handler,
Pydantic request validation errors, and application-level errors must all
serialize to the same `ErrorResponse` schema instead of FastAPI's assorted
default error shapes.

These handlers are defined here but not attached to an application in this
module — a later group's `app/main.py` app factory calls
`register_exception_handlers(app)` once the `FastAPI()` instance exists.
"""

from __future__ import annotations

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.middleware.correlation import CORRELATION_ID_HEADER
from app.schemas.common import ErrorDetail, ErrorResponse

#: Body returned for exceptions with no dedicated handler. Deliberately
#: opaque: the exception message may carry internal detail, and the
#: correlation ID is the supported way to tie a report back to the log.
INTERNAL_ERROR_DETAIL = "Internal server error"


class AppError(Exception):
    """Base class for application-level errors handled by `app_error_handler`.

    Feature modules raise this (or a subclass) for business-rule failures
    that are not schema-validation or generic-HTTP errors; the registered
    handler converts it to the shared `ErrorResponse` envelope.

    Attributes:
        status_code: HTTP status code to respond with.
        detail: Human-readable error message.
    """

    def __init__(self, status_code: int, detail: str) -> None:
        """Initialize an application error.

        Args:
            status_code: HTTP status code to respond with.
            detail: Human-readable error message.
        """
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


async def app_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle `AppError` by emitting an `ErrorResponse` envelope (SC-035).

    Args:
        request: The request being handled (unused; required by FastAPI's
            exception handler signature).
        exc: The raised exception. FastAPI only dispatches to this handler
            for exceptions registered as `AppError`.

    Returns:
        A `JSONResponse` with `exc.status_code` and an `ErrorResponse` body.

    Raises:
        AssertionError: If `exc` is not an `AppError`. Defensive only —
            FastAPI's exception dispatch guarantees this handler is only
            ever called with an `AppError` instance.
    """
    assert isinstance(exc, AppError)
    body = ErrorResponse(detail=exc.detail)
    return JSONResponse(status_code=exc.status_code, content=body.model_dump())


async def http_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle Starlette/FastAPI `HTTPException` as an `ErrorResponse`.

    Args:
        request: The request being handled (unused; required by FastAPI's
            exception handler signature).
        exc: The raised exception. FastAPI only dispatches to this handler
            for exceptions registered as `StarletteHTTPException`.

    Returns:
        A `JSONResponse` with `exc.status_code`, `exc.headers`, and an
        `ErrorResponse` body wrapping `exc.detail`.

    Raises:
        AssertionError: If `exc` is not a `StarletteHTTPException`.
            Defensive only — FastAPI's exception dispatch guarantees this
            handler is only ever called with that type.
    """
    assert isinstance(exc, StarletteHTTPException)
    body = ErrorResponse(detail=str(exc.detail))
    return JSONResponse(
        status_code=exc.status_code,
        content=body.model_dump(),
        headers=exc.headers,
    )


async def validation_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle Pydantic request validation errors as an `ErrorResponse`.

    Args:
        request: The request being handled (unused; required by FastAPI's
            exception handler signature).
        exc: The raised exception. FastAPI only dispatches to this handler
            for exceptions registered as `RequestValidationError`.

    Returns:
        A `422` `JSONResponse` whose body is an `ErrorResponse` with one
        `ErrorDetail` per validation failure (`error_code` unset, since
        Pydantic validation errors have no application-specific code).

    Raises:
        AssertionError: If `exc` is not a `RequestValidationError`.
            Defensive only — FastAPI's exception dispatch guarantees this
            handler is only ever called with that type.
    """
    assert isinstance(exc, RequestValidationError)
    details = [
        ErrorDetail(
            loc=list(error["loc"]),
            msg=error["msg"],
            type=error["type"],
            error_code=None,
        )
        for error in exc.errors()
    ]
    body = ErrorResponse(detail=details)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content=body.model_dump(),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle any exception with no dedicated handler as an `ErrorResponse`.

    Without this, an application bug escapes to Starlette's
    `ServerErrorMiddleware`, which answers with a `text/plain` "Internal
    Server Error" — the FastAPI-default shape SC-035 forbids — and loses
    the `X-Correlation-ID` header, because `ServerErrorMiddleware` sits
    outside `CorrelationIdMiddleware` and so bypasses its response
    post-processing. The correlation ID is read back off `request.state`,
    which is `scope`-backed and therefore survives that unwinding.

    Args:
        request: The request being handled. Read for its correlation ID.
        exc: The raised exception. Not serialized into the response — its
            message may carry internal detail; it is already logged with
            the correlation ID by `CorrelationIdMiddleware`.

    Returns:
        A `500` `JSONResponse` with an opaque `ErrorResponse` body, tagged
        with `X-Correlation-ID` when one was assigned.
    """
    correlation_id = getattr(request.state, "correlation_id", None)
    body = ErrorResponse(detail=INTERNAL_ERROR_DETAIL)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=body.model_dump(),
        headers={CORRELATION_ID_HEADER: correlation_id} if correlation_id else None,
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Attach the unified `ErrorResponse` exception handlers to `app`.

    Args:
        app: The `FastAPI` application to register handlers on. Intended
            to be called once from the app factory (a later group's
            `app/main.py`).
    """
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    # Starlette routes the `Exception` key to `ServerErrorMiddleware`'s
    # handler slot rather than the inner `ExceptionMiddleware`, so this
    # must stay a catch-all registration — it cannot be narrowed.
    app.add_exception_handler(Exception, unhandled_exception_handler)
