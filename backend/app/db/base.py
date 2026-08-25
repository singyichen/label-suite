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
NAMING_CONVENTION: dict[str, str] = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """Declarative base shared by every module's ORM models."""

    metadata = MetaData(naming_convention=NAMING_CONVENTION)
