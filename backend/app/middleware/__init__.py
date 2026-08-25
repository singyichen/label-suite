"""Cross-cutting FastAPI middleware and exception handlers.

Members are defined here but not attached to an application in this
package — a later group's `app/main.py` app factory imports from here and
wires everything into the `FastAPI()` instance (middleware via
`app.add_middleware`, handlers via `register_exception_handlers`).
"""

from __future__ import annotations

from app.middleware.correlation import CORRELATION_ID_HEADER, CorrelationIdMiddleware
from app.middleware.exception_handlers import AppError, register_exception_handlers

__all__ = [
    "CORRELATION_ID_HEADER",
    "AppError",
    "CorrelationIdMiddleware",
    "register_exception_handlers",
]
