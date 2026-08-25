"""Guards `.env.example` / `Settings` key parity.

FR-130 requires a reproducible local bootstrap contract that includes a
`.env.example`, and SC-045 requires that file to exist and be usable
(`specs/foundation/000-foundation/spec.md`). Neither spells out how the
example file stays truthful; a `.env.example` that has drifted from the
settings model is worse than none, because it documents variables the app
ignores and omits ones it requires at startup. Task 8.1 of the
`implement-foundation-core` change closes that with a script comparing
`.env.example`'s keys against `Settings`'s fields — this test is that check.

`.env.example` also documents env vars reserved for modules that do not
exist yet (Celery `REDIS_URL`, auth `SECRET_KEY`/`ALGORITHM`/..., etc. — see
`.github/workflows/ci.yml`, which already exports several of them). A
whole-file comparison against `Settings.model_fields` would therefore always
fail on those reserved-but-unimplemented keys, giving no signal about actual
drift. Instead, `.env.example` frames the subset of keys that `Settings`
actually owns between two sentinel comment lines; only that "managed"
subsection is checked here, so reserved keys for future modules are exempt
by construction.

These tests MUST fail until a later task adds the sentinel-framed managed
section to `.env.example` (strict TDD — no implementation here).
"""

from __future__ import annotations

from pathlib import Path

import pytest

from app.core.config import Settings

START_SENTINEL = "# --- managed: backend Settings (backend/app/core/config.py) ---"
END_SENTINEL = "# --- end managed ---"


def _env_example_path() -> Path:
    """Resolve the repo-root `.env.example` relative to this test file.

    Returns:
        Absolute path to the repo-root `.env.example`. Computed from
        `__file__` (this test lives at `backend/tests/test_env_example.py`,
        two directories below the repo root) rather than `os.getcwd()`, so
        the result does not depend on the directory pytest was invoked from.
    """
    return Path(__file__).resolve().parents[2] / ".env.example"


@pytest.fixture
def env_example_lines() -> list[str]:
    """Read the repo-root `.env.example`, split into individual lines.

    Returns:
        Every line of `.env.example`, in file order, with line endings
        stripped.
    """
    return _env_example_path().read_text(encoding="utf-8").splitlines()


def _extract_managed_section(lines: list[str]) -> list[str]:
    """Return the lines strictly between the managed-section sentinels.

    Args:
        lines: Full contents of `.env.example`, one entry per line, as
            produced by the `env_example_lines` fixture.

    Returns:
        The lines strictly between `START_SENTINEL` and `END_SENTINEL`
        (the sentinel lines themselves are excluded).

    Raises:
        AssertionError: If either sentinel is missing, or the start
            sentinel does not appear before the end sentinel — both are
            asserted with a message naming the exact sentinel text expected,
            so a missing/misordered sentinel is diagnosable without reading
            this test's source.
    """
    assert START_SENTINEL in lines, (
        f"{_env_example_path()} is missing the managed-section start "
        f"sentinel {START_SENTINEL!r}. Keys owned by Settings must be framed "
        "by sentinels so reserved keys for not-yet-implemented modules "
        "(e.g. Celery, auth) stay outside this consistency check."
    )
    assert END_SENTINEL in lines, (
        f"{_env_example_path()} is missing the managed-section end sentinel {END_SENTINEL!r}."
    )

    start_index = lines.index(START_SENTINEL)
    end_index = lines.index(END_SENTINEL)
    assert start_index < end_index, (
        f"Managed-section start sentinel {START_SENTINEL!r} (line "
        f"{start_index + 1}) must appear before the end sentinel "
        f"{END_SENTINEL!r} (line {end_index + 1}) in {_env_example_path()}."
    )

    return lines[start_index + 1 : end_index]


def test_managed_section_sentinels_exist_and_are_ordered(env_example_lines: list[str]) -> None:
    """Both sentinel lines must be present, in the correct order.

    Args:
        env_example_lines: The `.env.example` fixture content.
    """
    _extract_managed_section(env_example_lines)


def test_managed_keys_match_settings_fields_exactly(env_example_lines: list[str]) -> None:
    """The managed-section key set must equal `Settings.model_fields`, both ways.

    Field names are read from `Settings.model_fields` rather than hardcoded,
    so this test keeps guarding parity as fields are added to or removed
    from `Settings` in the future, without needing to be edited itself.

    Args:
        env_example_lines: The `.env.example` fixture content.
    """
    managed_lines = _extract_managed_section(env_example_lines)
    managed_keys = {
        stripped.split("=", 1)[0]
        for line in managed_lines
        if (stripped := line.strip()) and not stripped.startswith("#")
    }
    settings_keys = {field_name.upper() for field_name in Settings.model_fields}

    missing_from_env_example = settings_keys - managed_keys
    extra_in_env_example = managed_keys - settings_keys

    assert not missing_from_env_example and not extra_in_env_example, (
        "Settings fields missing from .env.example managed section: "
        f"{sorted(missing_from_env_example)}; "
        ".env.example managed-section keys not present on Settings: "
        f"{sorted(extra_in_env_example)}"
    )


def test_managed_section_contains_only_assignments_comments_or_blanks(
    env_example_lines: list[str],
) -> None:
    """Every managed-section line must be a `KEY=` assignment, a comment, or blank.

    Guards against stray noise (e.g. a line missing `=`) inside the managed
    section silently being excluded from the key-set comparison above.

    Args:
        env_example_lines: The `.env.example` fixture content.
    """
    managed_lines = _extract_managed_section(env_example_lines)

    for line in managed_lines:
        stripped = line.strip()
        is_blank = stripped == ""
        is_comment = stripped.startswith("#")
        is_assignment = "=" in stripped
        assert is_blank or is_comment or is_assignment, (
            f"Managed-section line {line!r} in {_env_example_path()} is neither "
            "blank, a comment, nor a KEY=VALUE assignment."
        )
