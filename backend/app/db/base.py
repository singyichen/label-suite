"""Shared SQLAlchemy declarative base and naming convention (FR-104).

Every ORM model in the application must inherit from `Base` (not
`sqlalchemy.orm.DeclarativeBase` directly) so that every constraint it
declares is named by the shared convention below, and so Alembic
autogenerate has a single `MetaData` instance to diff against.
"""

from __future__ import annotations

from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

# Standard SQLAlchemy/Alembic naming convention. Covers the five constraint
# kinds FR-104 requires (`ix`, `uq`, `ck`, `fk`, `pk`) so migrations never
# produce an unnamed constraint that can't be dropped/altered later.
# `ix`, `uq` and `fk` join every column (`column_0_N_name`), not just the first:
# two composite keys sharing a first column would otherwise get the same name,
# which PostgreSQL rejects (issue #793). Names over PostgreSQL's 63-character
# limit are truncated with a hash suffix by SQLAlchemy, so they stay distinct.
NAMING_CONVENTION: dict[str, str] = {
    "ix": "ix_%(table_name)s_%(column_0_N_name)s",
    "uq": "uq_%(table_name)s_%(column_0_N_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_N_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """Declarative base shared by every module's ORM models."""

    metadata = MetaData(naming_convention=NAMING_CONVENTION)
