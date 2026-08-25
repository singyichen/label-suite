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

import sqlalchemy as sa

from app.db.base import Base


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

        pk = NamingProbe.__table__.primary_key
        assert pk.name == "pk_naming_probe"

        unique_constraints = [
            constraint
            for constraint in NamingProbe.__table__.constraints
            if isinstance(constraint, sa.UniqueConstraint)
        ]
        assert len(unique_constraints) == 1
        assert unique_constraints[0].name == "uq_naming_probe_code"

        # Clean up so this throwaway table doesn't leak into other tests that
        # import `Base` and rely on `Base.metadata` being otherwise empty.
        Base.metadata.remove(NamingProbe.__table__)
