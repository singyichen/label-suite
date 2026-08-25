"""Failing tests for the async DB session dependency (`app/db/session.py`).

Covers the change spec delta requirement "資料庫 session 與 migration 基線"
(openspec/changes/implement-foundation-core/specs/foundation/000-foundation/spec.md:40-49)
and canonical FR-072
(specs/foundation/000-foundation/spec.md:377):

- FR-072: the `get_db` dependency must own the transaction boundary — commit
  on normal completion, rollback when an exception propagates through it.

These assertions drive `get_db` the same way FastAPI drives a `yield`
dependency for a route handler — see `tests/db/helpers.py` for why the
`asynccontextmanager` wrapper is required to reach the rollback branch.

Per `.claude/rules/testing-backend.md` ("Database tests must use a real test
DB — no mocking the ORM layer"), these tests exercise a real SQLite database
file (via `tmp_path`) rather than mocking `AsyncSession.commit`/`rollback`.
The same behaviour is verified against a real PostgreSQL server in
`test_postgres_integration.py`.

These tests MUST fail with `ModuleNotFoundError` on `app.db.session` until
task 2.2 implements the module (strict TDD — no implementation here).
"""

from pathlib import Path

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from tests.db.helpers import get_db_context


@pytest.fixture(autouse=True)
def _configure_test_database(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Point `DATABASE_URL` at an isolated on-disk SQLite file per test.

    Setting the variables is enough: `tests/conftest.py`'s autouse
    `reset_cached_singletons` runs first (conftest-level autouse fixtures are
    ordered ahead of module-level ones), so the `lru_cache`d `get_settings`
    and `get_engine` are already empty when the first call in the test body
    reads this environment.

    Args:
        tmp_path: pytest's per-test temporary directory fixture.
        monkeypatch: pytest's monkeypatch fixture, auto-reverted per test.
    """
    monkeypatch.setenv("ENVIRONMENT", "test")
    monkeypatch.setenv("ALLOWED_ORIGINS", "http://localhost:5173")
    monkeypatch.setenv("DATABASE_URL", f"sqlite+aiosqlite:///{tmp_path}/session_test.db")


class TestGetDbYieldsAsyncSession:
    """FR-072: `get_db` yields a usable async SQLAlchemy session."""

    async def test_yields_async_session_instance(self) -> None:
        async with get_db_context() as session:
            assert isinstance(session, AsyncSession)


class TestGetDbOwnsTransactionBoundary:
    """FR-072: `get_db` commits on success and rolls back on exception."""

    async def test_commits_on_normal_completion(self) -> None:
        async with get_db_context() as session:
            await session.execute(text("CREATE TABLE probe (id INTEGER PRIMARY KEY)"))
            await session.execute(text("INSERT INTO probe (id) VALUES (1)"))

        async with get_db_context() as verify_session:
            result = await verify_session.execute(text("SELECT id FROM probe"))
            assert result.scalar_one() == 1

    async def test_rolls_back_when_exception_propagates(self) -> None:
        async with get_db_context() as session:
            await session.execute(text("CREATE TABLE probe2 (id INTEGER PRIMARY KEY)"))

        class BoomError(Exception):
            """Marker exception used only to trigger the rollback path."""

        with pytest.raises(BoomError):
            async with get_db_context() as session:
                await session.execute(text("INSERT INTO probe2 (id) VALUES (99)"))
                raise BoomError

        async with get_db_context() as verify_session:
            result = await verify_session.execute(text("SELECT COUNT(*) FROM probe2"))
            assert result.scalar_one() == 0
