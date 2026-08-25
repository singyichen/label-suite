"""End-to-end round trip against a real PostgreSQL server.

`test_database_backends.py` proves the `asyncpg` driver resolves, but driver
resolution alone never opens a connection. FR-031 requires the test
environment to exercise a real PostgreSQL instance and forbids substituting a
mock for ORM integration tests, and the change spec delta scenario "資料庫層級
切換" claims the session factory and the FR-104 naming convention work
unmodified on PostgreSQL. These tests are what actually back that claim: they
create a table through `Base.metadata`, round-trip a row through `get_db`, and
read the generated constraint names back out of PostgreSQL's own catalog.

Marked `@pytest.mark.integration` per `.claude/rules/testing-backend.md`, and
skipped unless `DATABASE_URL` names a PostgreSQL server. CI's `backend-test`
job provisions `postgres:16` and points `DATABASE_URL` at it, so these run
there; a local `uv run pytest` without a server reports them as skipped rather
than passing vacuously.
"""

import os
from collections.abc import AsyncGenerator

import pytest
from sqlalchemy import String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.session import get_engine
from tests.db.helpers import get_db_context

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        not os.environ.get("DATABASE_URL", "").startswith("postgresql"),
        reason="DATABASE_URL does not point at PostgreSQL; CI's backend-test job provides one",
    ),
]


class PgProbe(Base):
    """Throwaway model used only to exercise a real PostgreSQL round trip.

    Declared at module scope so it registers with `Base`'s declarative
    registry exactly once; the table itself is created and dropped per test by
    the `probe_table` fixture.
    """

    __tablename__ = "pg_probe"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(32), unique=True)


@pytest.fixture
async def probe_table(monkeypatch: pytest.MonkeyPatch) -> AsyncGenerator[None, None]:
    """Create `pg_probe` on the live server and drop it afterwards.

    `DATABASE_URL` is deliberately left as CI supplies it — that real URL is
    the point of these tests — but `ALLOWED_ORIGINS` has no CI default and
    `Settings` requires it, so it is supplied here.

    Args:
        monkeypatch: pytest's monkeypatch fixture, auto-reverted per test.

    Yields:
        None, with the table present for the duration of the test.
    """
    monkeypatch.setenv("ALLOWED_ORIGINS", "http://localhost:5173")
    # Read the `Table` back out of the metadata rather than through
    # `PgProbe.__table__`, which the SQLAlchemy stubs type as `FromClause`.
    probe_table = Base.metadata.tables[PgProbe.__tablename__]
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all, tables=[probe_table])
    try:
        yield
    finally:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all, tables=[probe_table])
        await engine.dispose()


@pytest.mark.usefixtures("probe_table")
class TestPostgresRoundTrip:
    """FR-072 on PostgreSQL: `get_db` commits and rolls back against a server."""

    async def test_commits_a_row_visible_to_a_later_session(self) -> None:
        async with get_db_context() as session:
            session.add(PgProbe(id=1, code="committed"))

        async with get_db_context() as verify_session:
            stored = await verify_session.get(PgProbe, 1)
            assert stored is not None
            assert stored.code == "committed"

    async def test_rolls_back_when_exception_propagates(self) -> None:
        class BoomError(Exception):
            """Marker exception used only to trigger the rollback path."""

        with pytest.raises(BoomError):
            async with get_db_context() as session:
                session.add(PgProbe(id=2, code="rolled-back"))
                await session.flush()
                raise BoomError

        async with get_db_context() as verify_session:
            assert await verify_session.get(PgProbe, 2) is None


@pytest.mark.usefixtures("probe_table")
class TestPostgresAppliesNamingConvention:
    """FR-104: the convention must produce these names in the real catalog."""

    async def test_constraint_names_match_the_convention(self) -> None:
        async with get_db_context() as session:
            result = await session.execute(
                text(
                    "SELECT conname FROM pg_constraint "
                    "WHERE conrelid = 'pg_probe'::regclass ORDER BY conname"
                )
            )
            names = list(result.scalars())

        assert "pk_pg_probe" in names
        assert "uq_pg_probe_code" in names
