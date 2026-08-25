"""Application configuration and startup validation (FR-020 / FR-021 / FR-022 / FR-070).

Provides a Pydantic Settings model that loads all environment-dependent and
secret configuration exclusively from environment variables. Required values
that have no safe default fail validation immediately at `Settings()`
construction time, satisfying the "fail fast, before serving requests"
requirement (FR-022).
"""

from __future__ import annotations

from functools import lru_cache
from typing import Annotated, Self

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    """Process-wide application settings, sourced only from environment variables.

    Attributes:
        environment: Deployment environment identifier (e.g. "local", "test",
            "staging", "production", or "development"). Deliberately not
            constrained to a fixed enum/Literal: FR-021 and FR-070 only need
            to distinguish "production" from every other value, so any
            string is accepted and behavior branches solely on
            `environment == "production"` (see the validator below).
        allowed_origins: CORS allow-list, parsed from a comma-separated
            string (FR-021). Required — there is no safe universal default:
            a wildcard default would violate FR-021 / the project's CORS
            prohibition, and any other guessed default could silently
            misconfigure production, so a missing value must fail fast
            (FR-022) rather than fall back silently.
        database_url: SQLAlchemy async database URL (FR-020). Defaults to a
            local SQLite database (ADR-024 zero-friction local startup);
            override via the `DATABASE_URL` environment variable to point at
            PostgreSQL in CI/production. The exact production connection
            string format is owned by the DB/session layer (PR-FOUND-BE2),
            not by this module.
        enable_openapi_docs: Whether FastAPI `/docs` and `/redoc` are
            exposed (FR-070). When not explicitly set, defaults to `True`
            outside production and `False` in production; an explicit
            `ENABLE_OPENAPI_DOCS` value always overrides the default.
    """

    model_config = SettingsConfigDict(
        # No `backend/.env` file exists today; if one is added later,
        # explicit process environment variables still take precedence over
        # values loaded from it (pydantic-settings' default source order).
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: str = "local"
    allowed_origins: Annotated[list[str], NoDecode]
    database_url: str = "sqlite+aiosqlite:///./local.db"
    enable_openapi_docs: bool | None = None

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def _split_allowed_origins(cls, value: object) -> object:
        """Parse a comma-separated `ALLOWED_ORIGINS` string into a list.

        Args:
            value: Raw value from the environment (a comma-separated
                string), or an already-parsed list (e.g. when set
                programmatically in tests).

        Returns:
            A list of trimmed origin strings, or `value` unchanged if it is
            not a string.
        """
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",")]
        return value

    @model_validator(mode="after")
    def _validate_cors_and_derive_docs_flag(self) -> Self:
        """Enforce FR-021 and derive the FR-070 OpenAPI docs default.

        Raises:
            ValueError: If `allowed_origins` contains a wildcard entry, in
                any environment. FR-021 names the production case
                explicitly; the project's CORS prohibition (CLAUDE.md,
                "❌ allow_origins=[\"*\"]") is unconditional, and a
                publicly reachable staging or test deployment is exposed by
                a wildcard exactly as production is. Rejecting everywhere
                is a superset of FR-021, so it satisfies the canonical
                requirement rather than narrowing or contradicting it.

        Returns:
            This instance, with `enable_openapi_docs` resolved to a
            concrete `bool`.
        """
        if "*" in self.allowed_origins:
            raise ValueError("ALLOWED_ORIGINS must not contain a wildcard ('*')")

        if self.enable_openapi_docs is None:
            # FR-070: enabled by default outside production, disabled by
            # default in production; only applies when no explicit
            # ENABLE_OPENAPI_DOCS override was provided.
            self.enable_openapi_docs = self.environment != "production"

        return self


@lru_cache
def get_settings() -> Settings:
    """Return a process-wide cached `Settings` instance.

    Intended for use as a FastAPI dependency in later tasks (e.g.
    `app/main.py`, `app/modules/health/router.py`). Code that mutates
    environment variables and needs a fresh read must call
    `get_settings.cache_clear()` after changing the environment; tests that
    need per-test isolation should either call `cache_clear()` in a fixture
    teardown or construct `Settings()` directly, as
    `tests/core/test_config.py` does.

    Returns:
        The cached `Settings` instance.
    """
    return Settings()
