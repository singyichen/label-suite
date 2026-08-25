"""Failing tests for startup configuration validation (`app/core/config.py`).

Covers the change spec delta requirement "啟動期設定驗證"
(openspec/changes/implement-foundation-core/specs/foundation/000-foundation/spec.md:29-30)
and canonical FR-020/FR-021/FR-022
(specs/foundation/000-foundation/spec.md:469-471):

- FR-020: secrets / environment-dependent settings (DB URL, CORS origins) must
  be loaded only from environment variables, never hardcoded.
- FR-021: CORS is configured via `ALLOWED_ORIGINS`; `ALLOWED_ORIGINS=*` in
  production is a startup failure.
- FR-022: startup validation checks required environment variables; missing
  or invalid values must fail fast (a `pydantic.ValidationError` raised at
  `Settings()` construction time, before any request is served).
- FR-070: OpenAPI docs (`/docs`, `/redoc`) are enabled by default in
  development and disabled by default in production, controlled by
  `ENABLE_OPENAPI_DOCS`; an explicit override must always be respected.

Field-name decisions (none of these are contradicted by the canonical spec;
see the task report for full sourcing):

- `ALLOWED_ORIGINS` -> `Settings.allowed_origins: list[str]` — required, no
  default (FR-021 names this env var verbatim; a CORS default would either
  be the forbidden wildcard or an arbitrary guess that silently
  misconfigures production, so "missing" must fail fast per FR-022).
  Parsed from a comma-separated string, matching the existing root
  `.env.example`'s documented convention ("comma-separated list, no
  wildcards").
- `DATABASE_URL` -> `Settings.database_url: str` — sourced from the env var
  named verbatim in the delta spec and plan.md (ADR-024); this file does not
  assert a specific default value since the SQLite default string is owned
  by the DB/session task (PR-FOUND-BE2), not config validation.
- `ENVIRONMENT` -> `Settings.environment: str` — env var name confirmed
  verbatim by SC-036 ("pytest `monkeypatch` 設定 `ENVIRONMENT=\"production\"`",
  specs/foundation/000-foundation/spec.md:808). This file uses "local" (not
  "development") for the non-production case, matching the environment
  vocabulary enumerated for `SENTRY_ENVIRONMENT` ("local | test | staging |
  production", specs/foundation/000-foundation/spec.md:290) — the only
  canonical enum of environment values found. NOTE: the pre-existing root
  `.env.example` uses `ENVIRONMENT=development`, which conflicts with this
  vocabulary; flagged for task 8.1 to reconcile.
- `ENABLE_OPENAPI_DOCS` -> `Settings.enable_openapi_docs: bool` — env var
  name confirmed verbatim by FR-070 and plan.md Phase 0; no static default,
  it is derived from `environment` unless explicitly overridden.

These tests MUST fail with ModuleNotFoundError on `app.core.config` until a
later task implements `Settings` (strict TDD — no implementation here).
"""

import pytest
from app.core.config import Settings
from pydantic import ValidationError

# Complete, valid baseline env for non-production. Individual tests override
# or delete specific keys via monkeypatch to isolate the behavior under test.
_BASE_ENV = {
    "ENVIRONMENT": "local",
    "ALLOWED_ORIGINS": "http://localhost:5173,http://localhost:3000",
    "DATABASE_URL": "sqlite+aiosqlite:///./local.db",
}


def _apply_env(monkeypatch: pytest.MonkeyPatch, overrides: dict[str, str | None]) -> None:
    """Set `_BASE_ENV` plus `overrides` into the process environment.

    Args:
        monkeypatch: pytest's monkeypatch fixture, used so every mutation is
            automatically reverted after the test.
        overrides: Per-test env var overrides. A value of `None` deletes the
            key (simulating it being unset) instead of setting it.
    """
    env = {**_BASE_ENV, **overrides}
    for key, value in env.items():
        if value is None:
            monkeypatch.delenv(key, raising=False)
        else:
            monkeypatch.setenv(key, value)


class TestRequiredEnvVarsFailFast:
    """FR-022: missing required environment variables fail fast."""

    def test_missing_allowed_origins_raises_validation_error(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        # ALLOWED_ORIGINS has no safe default (FR-021 forbids the wildcard
        # default, and no environment-specific default is specified) so its
        # absence must fail fast rather than silently falling back.
        _apply_env(monkeypatch, {"ALLOWED_ORIGINS": None})

        with pytest.raises(ValidationError):
            Settings()


class TestAllowedOriginsCors:
    """FR-021: production rejects wildcard ALLOWED_ORIGINS."""

    def test_production_rejects_wildcard_allowed_origins(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        _apply_env(monkeypatch, {"ENVIRONMENT": "production", "ALLOWED_ORIGINS": "*"})

        with pytest.raises(ValidationError):
            Settings()

    def test_production_accepts_explicit_allowed_origins_list(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        _apply_env(
            monkeypatch,
            {
                "ENVIRONMENT": "production",
                "ALLOWED_ORIGINS": "https://app.example.com,https://admin.example.com",
            },
        )

        settings = Settings()

        assert settings.allowed_origins == [
            "https://app.example.com",
            "https://admin.example.com",
        ]


class TestEnableOpenApiDocsMatrix:
    """FR-070: dev enabled / production disabled by default; override respected."""

    def test_defaults_enabled_outside_production(self, monkeypatch: pytest.MonkeyPatch) -> None:
        _apply_env(monkeypatch, {"ENVIRONMENT": "local", "ENABLE_OPENAPI_DOCS": None})

        settings = Settings()

        assert settings.enable_openapi_docs is True

    def test_defaults_disabled_in_production(self, monkeypatch: pytest.MonkeyPatch) -> None:
        _apply_env(
            monkeypatch,
            {
                "ENVIRONMENT": "production",
                "ALLOWED_ORIGINS": "https://app.example.com",
                "ENABLE_OPENAPI_DOCS": None,
            },
        )

        settings = Settings()

        assert settings.enable_openapi_docs is False

    def test_explicit_override_enables_docs_in_production(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        _apply_env(
            monkeypatch,
            {
                "ENVIRONMENT": "production",
                "ALLOWED_ORIGINS": "https://app.example.com",
                "ENABLE_OPENAPI_DOCS": "true",
            },
        )

        settings = Settings()

        assert settings.enable_openapi_docs is True

    def test_explicit_override_disables_docs_outside_production(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        _apply_env(monkeypatch, {"ENVIRONMENT": "local", "ENABLE_OPENAPI_DOCS": "false"})

        settings = Settings()

        assert settings.enable_openapi_docs is False


class TestSecretsFromEnvironmentOnly:
    """FR-020: env-dependent settings (e.g. DATABASE_URL) come only from env vars."""

    def test_database_url_reflects_environment_variable(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        _apply_env(monkeypatch, {"DATABASE_URL": "postgresql+asyncpg://user:pw@db/label_suite"})

        settings = Settings()

        assert settings.database_url == "postgresql+asyncpg://user:pw@db/label_suite"

    def test_different_database_url_env_values_are_not_hardcoded(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        # Proves the value is sourced from the environment rather than a
        # fixed/hardcoded constant: two distinct env values must yield two
        # distinct Settings.database_url values.
        _apply_env(monkeypatch, {"DATABASE_URL": "sqlite+aiosqlite:///./a.db"})
        settings_a = Settings()

        _apply_env(monkeypatch, {"DATABASE_URL": "sqlite+aiosqlite:///./b.db"})
        settings_b = Settings()

        assert settings_a.database_url != settings_b.database_url
