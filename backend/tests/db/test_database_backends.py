"""Tests that the engine builds for both supported database backends.

Covers the change spec delta requirement "資料庫 session 與 migration 基線",
scenario "資料庫層級切換"
(openspec/changes/implement-foundation-core/specs/foundation/000-foundation/spec.md:47-49):
switching `DATABASE_URL` from the SQLite default to PostgreSQL must let the
same session factory and migrations work unmodified (ADR-024).

`create_async_engine` resolves and imports the dialect's DBAPI eagerly, so
these tests prove the required driver package is actually installed without
needing a live PostgreSQL server: a missing driver raises `ModuleNotFoundError`
at engine construction, before any connection is attempted. That is precisely
the failure that would otherwise stay latent until the first migration or the
first request in CI.

The complementary end-to-end proof — a real round trip against PostgreSQL —
lives in `test_postgres_integration.py`, which runs only where a server is
available.
"""

from pathlib import Path

import pytest

from app.core.config import get_settings
from app.db.session import get_engine, get_session_factory

# Credentials are placeholders for a connection that is never opened — the
# assertions below only exercise dialect/driver resolution.
_POSTGRES_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/label_eval_test"


@pytest.fixture(autouse=True)
def _valid_baseline_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    """Supply the settings each test needs beyond `DATABASE_URL`.

    Cache clearing is handled by `tests/conftest.py`'s autouse fixture, which
    is ordered ahead of this one; `_use_database_url` covers the mid-test
    switches below.

    Args:
        monkeypatch: pytest's monkeypatch fixture, auto-reverted per test.
    """
    monkeypatch.setenv("ENVIRONMENT", "test")
    monkeypatch.setenv("ALLOWED_ORIGINS", "http://localhost:5173")


def _use_database_url(monkeypatch: pytest.MonkeyPatch, url: str) -> None:
    """Repoint `DATABASE_URL` and invalidate the singletons derived from it.

    Both `get_settings` and `get_engine` are `lru_cache`d, so a URL change
    only takes effect once their caches are dropped.

    Args:
        monkeypatch: pytest's monkeypatch fixture, auto-reverted per test.
        url: The SQLAlchemy URL the next `get_engine()` call should build from.
    """
    monkeypatch.setenv("DATABASE_URL", url)
    get_settings.cache_clear()
    get_engine.cache_clear()


class TestEngineSupportsBothBackends:
    """The `DATABASE_URL` switch must work for SQLite and PostgreSQL alike."""

    def test_sqlite_default_uses_aiosqlite_driver(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        _use_database_url(monkeypatch, f"sqlite+aiosqlite:///{tmp_path}/backend_test.db")

        engine = get_engine()

        assert engine.dialect.name == "sqlite"
        assert engine.dialect.driver == "aiosqlite"

    def test_postgres_url_builds_engine_with_asyncpg_driver(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        # No server is contacted: reaching this assertion proves `asyncpg` is
        # installed, since the dialect imports its DBAPI during construction.
        _use_database_url(monkeypatch, _POSTGRES_URL)

        engine = get_engine()

        assert engine.dialect.name == "postgresql"
        assert engine.dialect.driver == "asyncpg"

    def test_session_factory_is_unchanged_across_backends(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        # The delta scenario requires "the same session factory" to work for
        # both backends, so assert one factory type is produced either way
        # rather than a backend-specific branch.
        _use_database_url(monkeypatch, f"sqlite+aiosqlite:///{tmp_path}/factory_test.db")
        sqlite_factory = get_session_factory()

        _use_database_url(monkeypatch, _POSTGRES_URL)
        postgres_factory = get_session_factory()

        assert type(sqlite_factory) is type(postgres_factory)
        assert sqlite_factory.kw["bind"].dialect.name == "sqlite"
        assert postgres_factory.kw["bind"].dialect.name == "postgresql"
