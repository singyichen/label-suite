"""Contract tests for issue #1295: the `security` pytest marker must exist and select tests."""

import subprocess
import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[2]


def test_security_marker_is_registered(pytestconfig: pytest.Config) -> None:
    """Issue #1295: `security` must be registered in pytest markers."""
    markers: list[str] = pytestconfig.getini("markers")
    assert any(marker.startswith("security:") for marker in markers)


def test_strict_markers_enabled(pytestconfig: pytest.Config) -> None:
    """Issue #1295: `--strict-markers` must be in addopts so marker typos fail loudly."""
    addopts = pytestconfig.getini("addopts")
    options = addopts.split() if isinstance(addopts, str) else list(addopts)
    assert "--strict-markers" in options


def test_security_marker_selects_at_least_one_test() -> None:
    """Issue #1295: `pytest -m security` must collect tests (exit 5 means none selected)."""
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "pytest",
            "-m",
            "security",
            "--collect-only",
            "-q",
            "-p",
            "no:cacheprovider",
        ],
        cwd=BACKEND_DIR,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    assert "::" in result.stdout
