---
paths:
  - "backend/**"
---

# API Rules

## Design Conventions

- Follow RESTful conventions: nouns for resources, HTTP verbs for actions
- Route pattern: `/api/v1/[module]/[resource]`
- Use plural nouns for collection endpoints (e.g. `/tasks`, `/annotations`)

## Request & Response

- All request bodies must be validated via Pydantic schemas (`app/schemas/`)
- Response schemas must be explicit — never return raw ORM models
- Paginated list responses use the shared `PaginatedResponse[T]` wrapper; query params are `limit: int` (default `PAGINATION_DEFAULT_LIMIT`, max `PAGINATION_MAX_LIMIT`) and `offset: int` (default `0`); response includes `next_offset: int | None` so frontend never needs to compute the next offset
- Error responses follow the shared `ErrorResponse` schema with `detail` field; the `detail` string is localized by the backend based on the request `Accept-Language` header (see ADR-026) — frontend renders it directly without re-mapping

## Status Codes

- `200` for successful reads and updates
- `201` for successful creates (include `Location` header)
- `204` for successful deletes (no body)
- `422` for validation errors (FastAPI default)
- `403` vs `404`: prefer `404` when hiding resource existence from unauthorized users

## Auth & Permissions

- All protected routes must declare a `current_user` dependency
- Permission checks belong in the route handler or a dedicated `permissions.py`, not in CRUD helpers
- Task-scoped operations must verify `task_membership` before proceeding

## FastAPI Specifics

- Group routes by module using `APIRouter` with a consistent prefix and tags
- Dependency injection for DB session: `db: AsyncSession = Depends(get_db)`
- Use `response_model=` on every route; never omit it
