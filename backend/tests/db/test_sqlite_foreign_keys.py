"""Regression tests for issue #778: SQLite foreign keys must be enforced.

ADR-024 (`docs/adr/024-database-quickstart-sqlite-tiered.md`) picks SQLite as
the local quick-start database, but SQLite disables foreign key enforcement
by default on every new connection. `get_engine()`
(`app/db/session.py`) built the async engine with no `connect` event to turn
enforcement on, so a foreign-key-declaring model would pass on SQLite and
only fail against PostgreSQL — or worse, silently accept orphan rows on
SQLite in production-shaped local development.

These tests exercise the project's own `get_engine()` against a real,
on-disk SQLite database (per `.claude/rules/testing-backend.md` — no mocking
the ORM/DBAPI layer) and must fail until a `connect` event runs
`PRAGMA foreign_keys=ON` for the sqlite dialect only.
"""

from pathlib import Path

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.db.session import get_engine


@pytest.fixture(autouse=True)
def _configure_test_database(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Point `DATABASE_URL` at an isolated on-disk SQLite file per test.

    Args:
        tmp_path: pytest's per-test temporary directory fixture.
        monkeypatch: pytest's monkeypatch fixture, auto-reverted per test.
    """
    monkeypatch.setenv("ENVIRONMENT", "test")
    monkeypatch.setenv("ALLOWED_ORIGINS", "http://localhost:5173")
    monkeypatch.setenv("DATABASE_URL", f"sqlite+aiosqlite:///{tmp_path}/fk_probe.db")


class TestSqliteForeignKeysEnforced:
    """Issue #778: `get_engine()` must turn on SQLite foreign key enforcement."""

    async def test_pragma_foreign_keys_is_on(self) -> None:
        """A fresh SQLite connection from `get_engine()` reports `PRAGMA foreign_keys` as on."""
        engine = get_engine()

        async with engine.connect() as conn:
            result = await conn.execute(text("PRAGMA foreign_keys"))
            assert result.scalar_one() == 1

    async def test_inserting_orphan_child_row_raises_integrity_error(self) -> None:
        """Inserting a child row whose parent does not exist is rejected with `IntegrityError`."""
        engine = get_engine()

        async with engine.begin() as conn:
            await conn.execute(text("CREATE TABLE parent (id INTEGER PRIMARY KEY)"))
            await conn.execute(
                text(
                    "CREATE TABLE child ("
                    "id INTEGER PRIMARY KEY, "
                    "parent_id INTEGER NOT NULL REFERENCES parent(id))"
                )
            )

        with pytest.raises(IntegrityError):
            async with engine.begin() as conn:
                await conn.execute(text("INSERT INTO child (id, parent_id) VALUES (1, 999)"))
