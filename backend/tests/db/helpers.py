"""Shared helper for driving `get_db` the way FastAPI drives it.

`contextlib.asynccontextmanager(get_db)()` resumes the generator after its
`yield` on clean exit (running the commit path) and throws the raised
exception into the generator on error exit (running the rollback path). A bare
`async for` would not reproduce this: an exception raised in the loop body
never reaches the generator's `except` clause, so the rollback branch would go
untested while still appearing covered.
"""

from contextlib import asynccontextmanager

from app.db.session import get_db

get_db_context = asynccontextmanager(get_db)
