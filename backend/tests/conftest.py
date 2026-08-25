"""Shared fixtures for the whole backend test suite.

`app.core.config.get_settings` and `app.db.session.get_engine` are both
`lru_cache`d process-wide singletons. A test that repoints `DATABASE_URL` at a
`tmp_path` file therefore leaves a cached `Settings`/`AsyncEngine` bound to a
directory pytest deletes as soon as that test finishes, and every later test
module in the same process inherits it. Clearing on teardown as well as on
setup keeps that stale state from escaping the test that created it.

This fixture is autouse at the package root, so it runs before any
module-level autouse fixture. Test modules that repoint `DATABASE_URL` only
need to set the environment variable; the caches are already empty by then.
"""

from collections.abc import Iterator

import pytest

from app.core.config import get_settings
from app.db.session import get_engine


@pytest.fixture(autouse=True)
def reset_cached_singletons() -> Iterator[None]:
    """Clear the cached `Settings` and `AsyncEngine` around every test.

    Yields:
        None. Control returns to the test with both caches empty, and both are
        cleared again once the test completes (including on failure).
    """
    get_settings.cache_clear()
    get_engine.cache_clear()
    yield
    get_settings.cache_clear()
    get_engine.cache_clear()
