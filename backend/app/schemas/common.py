"""Shared cross-module Pydantic schemas.

Implements the Foundation-Core schema baseline (FR-103, FR-115, FR-116,
FR-068, FR-069): a common `AppBaseModel` base, the unified error envelope
(`ErrorResponse` / `ErrorDetail`), the generic `PaginatedResponse[T]` list
wrapper, and the `HealthResponse` schema for `GET /api/v1/health`.
"""

from __future__ import annotations

import math
from typing import Generic, Self, TypeVar

from pydantic import BaseModel, ConfigDict, model_validator

T = TypeVar("T")


class AppBaseModel(BaseModel):
    """Base schema all module schemas should inherit from (FR-103).

    Centralizes global schema behavior. Currently sets `from_attributes=True`
    so subclasses can be constructed directly from ORM instances
    (`Model.model_validate(orm_obj)`) without repeating the config in every
    module schema.
    """

    model_config = ConfigDict(from_attributes=True)


class ErrorDetail(AppBaseModel):
    """A single error item within an `ErrorResponse` (FR-116).

    Attributes:
        loc: Location of the offending field (e.g. `["body", "field"]`), or
            `None` when the error is not tied to a specific field/location.
        msg: Human-readable error message.
        type: Machine-readable error category (schema validation /
            application rule / auth / not_found — exact semantics per
            category are defined by the owning spec; see FR-088 for frontend
            consumption).
        error_code: Optional application-specific error code, or `None` when
            not applicable.
    """

    loc: list[str | int] | None
    msg: str
    type: str
    error_code: str | None


class ErrorResponse(AppBaseModel):
    """Unified API error response envelope (FR-115).

    Every API error (FastAPI exception handler, Pydantic validation error,
    auth error, application error) must serialize to this schema.

    Attributes:
        detail: Either a single human-readable message, or a list of
            `ErrorDetail` items (e.g. for validation errors with multiple
            field failures).
    """

    detail: str | list[ErrorDetail]


class PaginatedResponse(AppBaseModel, Generic[T]):
    """Generic paginated list response wrapper (FR-068 / FR-069).

    Callers supply `items`, `total`, `limit`, and `offset`; `has_more`,
    `total_pages`, and `next_offset` are derived automatically from those
    four fields at construction time — no additional DB query is required.

    Attributes:
        items: The page of results.
        total: Total number of matching records across all pages.
        limit: Maximum number of items requested per page.
        offset: Number of records skipped before this page.
        has_more: Whether a subsequent page exists. Derived as
            `offset + limit < total`.
        total_pages: Total number of pages. Derived as `ceil(total / limit)`
            when `limit > 0`, otherwise `0`.
        next_offset: The `offset` value to use for the next page, or `None`
            when there is no next page (including when `offset >= total`,
            per FR-069's empty-page semantics).
    """

    items: list[T]
    total: int
    limit: int
    offset: int
    has_more: bool = False
    total_pages: int = 0
    next_offset: int | None = None

    @model_validator(mode="after")
    def _derive_pagination_fields(self) -> Self:
        """Compute `has_more`, `total_pages`, and `next_offset`.

        Returns:
            This instance, with the derived fields populated in place.
        """
        self.has_more = self.offset + self.limit < self.total
        self.total_pages = math.ceil(self.total / self.limit) if self.limit > 0 else 0
        self.next_offset = self.offset + self.limit if self.has_more else None
        return self


class HealthResponse(AppBaseModel):
    """Response for `GET /api/v1/health`.

    Attributes:
        status: Service health status (e.g. `"ok"`).
        version: Application version string.
    """

    status: str
    version: str
