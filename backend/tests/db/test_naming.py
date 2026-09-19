"""Failing tests for the shared declarative base (`app/db/base.py`).

Covers the change spec delta requirement "資料庫 session 與 migration 基線"
(openspec/changes/implement-foundation-core/specs/foundation/000-foundation/spec.md:40-49)
and canonical FR-104
(specs/foundation/000-foundation/spec.md:535):

- FR-104: `app/db/base.py` (or an equivalent metadata initialization point)
  must define a SQLAlchemy naming convention covering at least `ix`, `uq`,
  `ck`, `fk`, `pk`, so migrations never produce an unnamed constraint.

These tests MUST fail with `ModuleNotFoundError` on `app.db.base` until task
2.2 implements the module (strict TDD — no implementation here).
"""

import re

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.schema import CreateIndex, CreateTable

from app.db.base import NAMING_CONVENTION, Base


class TestNamingConventionDeclaration:
    """FR-104: the shared metadata declares all five required convention keys."""

    def test_covers_ix_uq_ck_fk_pk(self) -> None:
        convention = Base.metadata.naming_convention
        for key in ("ix", "uq", "ck", "fk", "pk"):
            assert key in convention, f"naming_convention is missing required key {key!r}"


class TestNamingConventionAppliesToConstraints:
    """FR-104: constraints on a declarative model are named, not anonymous."""

    def test_generates_named_primary_key_and_unique_constraint(self) -> None:
        class NamingProbe(Base):
            """Throwaway model used only to inspect generated constraint names."""

            __tablename__ = "naming_probe"

            id: sa.orm.Mapped[int] = sa.orm.mapped_column(primary_key=True)
            code: sa.orm.Mapped[str] = sa.orm.mapped_column(sa.String(32), unique=True)

        # Read the `Table` back out of the metadata rather than through
        # `NamingProbe.__table__`, which the SQLAlchemy stubs type as the
        # looser `FromClause`; CI runs `mypy .` with `strict = true`, so the
        # test files are type-checked as strictly as `app/`.
        probe_table = Base.metadata.tables[NamingProbe.__tablename__]

        assert probe_table.primary_key.name == "pk_naming_probe"

        unique_constraints = [
            constraint
            for constraint in probe_table.constraints
            if isinstance(constraint, sa.UniqueConstraint)
        ]
        assert len(unique_constraints) == 1
        assert unique_constraints[0].name == "uq_naming_probe_code"

        # Clean up so this throwaway table doesn't leak into other tests that
        # import `Base` and rely on `Base.metadata` being otherwise empty.
        Base.metadata.remove(probe_table)


def _collision_probe_table(table_name: str) -> sa.Table:
    """Build a table whose composite keys all share their first column.

    Uses a private `MetaData` carrying the shared convention so the probe never
    registers with `Base.metadata`. Two unique constraints, two indexes and two
    foreign keys each start with `task_id`, which is the shape task membership,
    trial rounds and identity links will have (issue #793).
    """
    metadata = sa.MetaData(naming_convention=NAMING_CONVENTION)
    sa.Table(
        "collision_parent",
        metadata,
        sa.Column("a", sa.Integer),
        sa.Column("b", sa.Integer),
        sa.PrimaryKeyConstraint("a", "b"),
    )
    table = sa.Table(
        table_name,
        metadata,
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("task_id", sa.Integer),
        sa.Column("user_id", sa.Integer),
        sa.Column("trial_round", sa.Integer),
        sa.UniqueConstraint("task_id", "user_id"),
        sa.UniqueConstraint("task_id", "trial_round"),
        sa.Index(None, "task_id", "user_id"),
        sa.Index(None, "task_id", "trial_round"),
        sa.ForeignKeyConstraint(
            ["task_id", "user_id"], ["collision_parent.a", "collision_parent.b"]
        ),
        sa.ForeignKeyConstraint(
            ["task_id", "trial_round"], ["collision_parent.a", "collision_parent.b"]
        ),
    )
    return table


def _postgres_names(table: sa.Table) -> dict[str, list[str]]:
    """Return the constraint and index names PostgreSQL DDL would emit.

    Names are read from the compiled DDL rather than `constraint.name` because
    PostgreSQL's 63-character identifier limit is applied at compile time.
    """
    # Building an engine never connects; it only resolves the asyncpg dialect
    # the application uses on PostgreSQL.
    dialect = create_async_engine("postgresql+asyncpg://probe@localhost/probe").dialect
    table_ddl = str(CreateTable(table).compile(dialect=dialect))
    constraint_names = re.findall(r"CONSTRAINT (\S+) ", table_ddl)
    index_names = [
        str(CreateIndex(index).compile(dialect=dialect)).split()[2] for index in table.indexes
    ]
    return {
        "uq": [name for name in constraint_names if name.startswith("uq_")],
        "fk": [name for name in constraint_names if name.startswith("fk_")],
        "ix": index_names,
    }


class TestNamingConventionDistinguishesCompositeKeys:
    """FR-104 / issue #793: composite keys sharing a first column get distinct names.

    A convention that only uses the first column names both constraints the
    same. SQLite ignores constraint names, so only PostgreSQL DDL exposes it.
    """

    def test_composite_keys_sharing_first_column_have_distinct_names(self) -> None:
        table = _collision_probe_table("membership")
        names = _postgres_names(table)

        for kind in ("uq", "ix", "fk"):
            assert len(names[kind]) == 2, f"expected two {kind} names, got {names[kind]}"
            assert len(set(names[kind])) == 2, f"{kind} names collide: {names[kind]}"

    def test_names_stay_distinct_after_postgres_identifier_truncation(self) -> None:
        table = _collision_probe_table("dataset_sample_divergence_outlier")
        names = _postgres_names(table)

        for kind in ("uq", "ix", "fk"):
            assert all(len(name) <= 63 for name in names[kind]), names[kind]
            assert len(set(names[kind])) == 2, f"{kind} names collide: {names[kind]}"

    def test_single_column_names_are_unchanged(self) -> None:
        metadata = sa.MetaData(naming_convention=NAMING_CONVENTION)
        sa.Table("single_parent", metadata, sa.Column("id", sa.Integer, primary_key=True))
        table = sa.Table(
            "single_probe",
            metadata,
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("code", sa.String(32), unique=True),
            sa.Column("slug", sa.String(32), index=True),
            sa.Column("parent_id", sa.Integer, sa.ForeignKey("single_parent.id")),
        )

        names = {
            constraint.name
            for constraint in table.constraints
            if isinstance(constraint, (sa.UniqueConstraint, sa.ForeignKeyConstraint))
        }
        assert names == {"uq_single_probe_code", "fk_single_probe_parent_id_single_parent"}
        assert [index.name for index in table.indexes] == ["ix_single_probe_slug"]
