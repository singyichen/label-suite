"""Async database engine and session dependency (FR-072).

Builds an async SQLAlchemy engine from `Settings.database_url` (SQLite by
default locally, PostgreSQL in CI/production via the `DATABASE_URL`
environment variable — ADR-024) and exposes `get_db`, a FastAPI dependency
that owns the transaction boundary: it commits when the wrapped route
handler completes normally, and rolls back when an exception propagates
through it (design.md decision 2, FR-072 option B).
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from functools import lru_cache
from typing import Any

from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings


def _enable_sqlite_foreign_keys(dbapi_connection: Any, connection_record: Any) -> None:
    """Turn on SQLite foreign key enforcement for a new DBAPI connection.

    SQLite disables foreign key checks by default on every connection
    (issue #778), so `FOREIGN KEY` / `ON DELETE CASCADE|RESTRICT` clauses
    silently no-op locally while PostgreSQL enforces them — the opposite of
    ADR-024's goal of a SQLite quick-start layer that behaves like production.
    Registered only for the sqlite dialect in `get_engine()`; PostgreSQL
    connections never reach this handler.

    Args:
        dbapi_connection: The raw DBAPI connection SQLAlchemy just opened.
        connection_record: Unused; required by SQLAlchemy's `connect` event
            signature.
    """
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


@lru_cache
def get_engine() -> AsyncEngine:
    """Return a process-wide cached async SQLAlchemy engine.

    The engine is built lazily (not at import time) from `Settings`, mirroring
    `app.core.config.get_settings`'s caching pattern. Tests that need a fresh
    engine bound to a different `DATABASE_URL` must call `get_engine.cache_clear()`
    (and `get_settings.cache_clear()`) after changing the environment.

    For the sqlite dialect, registers a `connect` event that runs
    `PRAGMA foreign_keys=ON` on every new DBAPI connection (issue #778);
    PostgreSQL is unaffected since it enforces foreign keys natively.

    Returns:
        The cached `AsyncEngine` instance.
    """
    settings = get_settings()
    engine = create_async_engine(settings.database_url)
    if engine.dialect.name == "sqlite":
        event.listen(engine.sync_engine, "connect", _enable_sqlite_foreign_keys)
    return engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Build a session factory bound to the process-wide async engine.

    Returns:
        An `async_sessionmaker` producing `AsyncSession` instances bound to
        `get_engine()`.
    """
    return async_sessionmaker(get_engine(), expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding an `AsyncSession` that owns its transaction.

    Commits the session when the caller (e.g. a route handler) completes
    without raising; rolls back and re-raises when an exception propagates
    through the `yield`. Callers must not call `commit()`/`rollback()`
    themselves (FR-072 option B) — the dependency is the sole owner of the
    transaction boundary.

    Yields:
        An `AsyncSession` bound to the process-wide engine.

    Raises:
        Exception: Re-raises whatever exception propagated through the
            `yield`, after rolling back the session.
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
