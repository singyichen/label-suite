"""Smoke test verifying the `app` package is importable.

Ensures pytest collects at least one test so `uv run pytest tests/ -q`
exits 0 instead of pytest's exit code 5 (no tests collected).
"""

import app


def test_app_package_importable() -> None:
    assert app is not None
