"""Request correlation ID middleware and structured JSON request logging.

Implements the canonical "請求關聯" requirement (FR-046): every HTTP request
is assigned a freshly generated UUID v4 correlation ID, echoed back via the
`X-Correlation-ID` response header and attached to the request-completed
log record, so a single ID ties a client-visible response to its server-side
log line. Also implements the structured logging field set required by
FR-047 via `JsonLogFormatter`.
"""

from __future__ import annotations

import json
import logging
import uuid
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

CORRELATION_ID_HEADER = "X-Correlation-ID"

#: Logger used for the per-request "request completed" log line. A later
#: group's app factory is responsible for configuring handlers/level for
#: this logger name; this module only emits records against it.
request_logger = logging.getLogger("app.request")


class JsonLogFormatter(logging.Formatter):
    """Formats log records as single-line JSON (FR-047).

    Emits at least `timestamp`, `level`, `correlation_id`, `user_id`, and
    `message` for every record, matching the structured logging fields
    required by FR-047. There is no authentication layer yet, so `user_id`
    has no source: it is emitted as `None` unless the record was logged
    with `extra={"user_id": ...}` (e.g. `record.user_id` set by a future
    auth layer once one exists).
    """

    def format(self, record: logging.LogRecord) -> str:
        """Render a log record as a JSON string.

        Args:
            record: The log record to format.

        Returns:
            A JSON-encoded string with `timestamp`, `level`,
            `correlation_id`, `user_id`, and `message` keys.
        """
        payload = {
            "timestamp": datetime.fromtimestamp(record.created, tz=UTC).isoformat(),
            "level": record.levelname,
            "correlation_id": getattr(record, "correlation_id", None),
            "user_id": getattr(record, "user_id", None),
            "message": record.getMessage(),
        }
        return json.dumps(payload)


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Assigns a per-request UUID v4 correlation ID (FR-046).

    Every request is assigned a freshly generated `uuid4` correlation ID.
    An inbound `X-Correlation-ID` request header, if present, is
    deliberately ignored: FR-046's canonical wording only requires the
    backend to *generate* the ID, and honoring a client-supplied value
    would be an unvetted request-smuggling / log-injection surface.

    The generated ID is echoed back via the `X-Correlation-ID` response
    header and attached to the "request completed" log record via
    `extra={"correlation_id": ...}`, so log lines can be correlated with
    the response the client received.
    """

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        """Assign a correlation ID, run the request, then log and tag the response.

        Args:
            request: The incoming request.
            call_next: The next handler in the middleware chain.

        Returns:
            The response produced by `call_next`, with the
            `X-Correlation-ID` header set to the generated correlation ID.
        """
        correlation_id = str(uuid.uuid4())
        request.state.correlation_id = correlation_id

        # `user_id` is unpopulated until an authentication layer exists; a
        # future auth layer can set `request.state.user_id`.
        log_context = {
            "correlation_id": correlation_id,
            "user_id": getattr(request.state, "user_id", None),
        }

        try:
            response = await call_next(request)
        except Exception:
            # An exception here means no registered handler claimed it, so
            # the response is produced by `ServerErrorMiddleware` — which
            # sits *outside* this middleware, meaning the code below never
            # runs. Log the failed request here or it would be the one
            # request with no log line at all. The header is restored by
            # `unhandled_exception_handler`, which reads the correlation ID
            # back off `request.state`.
            request_logger.exception(
                "%s %s -> unhandled exception",
                request.method,
                request.url.path,
                extra=log_context,
            )
            raise

        response.headers[CORRELATION_ID_HEADER] = correlation_id
        request_logger.info(
            "%s %s -> %d",
            request.method,
            request.url.path,
            response.status_code,
            extra=log_context,
        )
        return response
