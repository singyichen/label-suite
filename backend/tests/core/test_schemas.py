"""Failing tests for shared Pydantic schemas (`app/schemas/common.py`).

Covers:
- FR-103: `AppBaseModel` centralizes `model_config` (asserted: `from_attributes`,
  the only concrete config key named in FR-103's wording).
- FR-116: `ErrorDetail` field presence/optionality
  (`loc: list[str | int] | None`, `msg: str`, `type: str`, `error_code: str | None`).
- FR-115: `ErrorResponse.detail` accepts both union arms (`str` and `list[ErrorDetail]`).
- FR-068 / FR-069: `PaginatedResponse[T]` derives `has_more`, `total_pages`,
  `next_offset` from `total` / `limit` / `offset` with no DB access, including
  the empty-page semantics when `offset >= total`.
- `HealthResponse` field presence (`status: str`, `version: str`).

These tests MUST fail with ModuleNotFoundError on `app.schemas.common` until
task 1.3 implements the schemas (strict TDD — no implementation in this step).
"""

from app.schemas.common import (
    AppBaseModel,
    ErrorDetail,
    ErrorResponse,
    HealthResponse,
    PaginatedResponse,
)


class TestAppBaseModel:
    """FR-103: AppBaseModel centralizes model_config for all module schemas."""

    def test_model_config_enables_from_attributes(self) -> None:
        assert AppBaseModel.model_config.get("from_attributes") is True

    def test_subclass_inherits_from_attributes_config(self) -> None:
        # HealthResponse must inherit AppBaseModel's model_config (FR-103:
        # "module schema 必須繼承此 base").
        assert HealthResponse.model_config.get("from_attributes") is True


class TestErrorDetail:
    """FR-116: ErrorDetail field presence and optionality."""

    def test_accepts_all_fields_populated(self) -> None:
        detail = ErrorDetail(
            loc=["body", "field"],
            msg="field required",
            type="missing",
            error_code="REQUIRED_FIELD",
        )
        assert detail.loc == ["body", "field"]
        assert detail.msg == "field required"
        assert detail.type == "missing"
        assert detail.error_code == "REQUIRED_FIELD"

    def test_loc_accepts_mixed_str_and_int_items(self) -> None:
        detail = ErrorDetail(
            loc=["body", 0, "field"], msg="msg", type="value_error", error_code=None
        )
        assert detail.loc == ["body", 0, "field"]

    def test_loc_and_error_code_are_optional(self) -> None:
        detail = ErrorDetail(loc=None, msg="msg", type="value_error", error_code=None)
        assert detail.loc is None
        assert detail.error_code is None


class TestErrorResponse:
    """FR-115: ErrorResponse.detail accepts `str | list[ErrorDetail]`."""

    def test_detail_accepts_string(self) -> None:
        response = ErrorResponse(detail="Something went wrong")
        assert response.detail == "Something went wrong"

    def test_detail_accepts_error_detail_list(self) -> None:
        items = [
            ErrorDetail(
                loc=["body", "field"], msg="field required", type="missing", error_code=None
            )
        ]
        response = ErrorResponse(detail=items)
        assert response.detail == items


class TestPaginatedResponse:
    """FR-068 / FR-069: derived pagination fields, no DB access."""

    def test_derives_has_more_total_pages_next_offset(self) -> None:
        # Canonical scenario: total=25, limit=10, offset=10.
        page = PaginatedResponse[int](
            items=list(range(10)),
            total=25,
            limit=10,
            offset=10,
        )
        assert page.has_more is True
        assert page.total_pages == 3
        assert page.next_offset == 20

    def test_empty_page_when_offset_at_or_beyond_total(self) -> None:
        # FR-069: offset >= total -> empty items, has_more False, no next_offset.
        page = PaginatedResponse[int](
            items=[],
            total=5,
            limit=10,
            offset=10,
        )
        assert page.items == []
        assert page.has_more is False
        assert page.next_offset is None


class TestHealthResponse:
    """HealthResponse: status + version fields."""

    def test_fields_present(self) -> None:
        response = HealthResponse(status="ok", version="0.1.0")
        assert response.status == "ok"
        assert response.version == "0.1.0"
