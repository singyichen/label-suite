# ADR-003: Use FastAPI as Backend Framework

**Status**: Accepted
**Date**: 2026-03-19

## Context

The backend must expose a REST API for the annotation portal, handle async evaluation jobs (via Celery), and serve multiple concurrent annotators. Key requirements:

- Native async/await for I/O-bound workloads (DB queries, Celery task dispatch, scoring computation).
- Strong request/response validation tied to Python type hints.
- Auto-generated OpenAPI documentation (essential for a Demo Paper system showcase).
- Active ecosystem with pytest and mypy integration.
- Pure Python toolchain consistent with the rest of the backend stack.

### Candidates Evaluated

| Framework | Async | Validation | Auto Docs | Type Safety | Maturity |
|-----------|:-----:|:----------:|:---------:|:-----------:|:--------:|
| **FastAPI** | Native | Pydantic v2 | OpenAPI | mypy strict | High |
| Django + DRF | Partial | DRF serializers | Manual | Partial | Very High |
| Flask | Plugin | Plugin | Plugin | Partial | Very High |
| Litestar | Native | Pydantic v2 | OpenAPI | mypy strict | Medium |

**Django + DRF rejected**: Synchronous-first design adds complexity for async workloads; heavy ORM with admin is unnecessary overhead for a research system. No native Pydantic integration.

**Flask rejected**: No native async, no built-in validation, no auto docs — requires assembling many plugins for features FastAPI provides out of the box.

**Litestar considered**: Technically comparable to FastAPI but smaller community and ecosystem. FastAPI has broader adoption, more tutorials, and is explicitly used in the official Pydantic and SQLAlchemy docs.

## Decision

Use **FastAPI** as the backend web framework.

Supporting libraries:
- `pydantic` v2: request/response schema validation and serialization.
- `uvicorn`: ASGI server for local development and production.
- `httpx`: async HTTP client for test suite (replaces `requests`).
- `pytest-asyncio`: async test support for FastAPI endpoint tests.

## Consequences

### Easier
- Native `async def` route handlers integrate directly with async SQLAlchemy and Celery task dispatch.
- Pydantic schemas serve as both the API contract and the data validation layer — a single source of truth for request/response shape.
- Auto-generated `/docs` (Swagger UI) and `/redoc` serve as live API documentation — valuable for Demo Paper demonstration without extra effort.
- First-class dependency injection (`Depends`) enables clean separation of DB sessions, auth, and config across routes.
- FastAPI's `TestClient` (via httpx) makes unit-testing endpoints straightforward.
- mypy strict mode works well with FastAPI's type annotations.

### Harder
- No built-in admin interface (unlike Django) — admin tasks require direct DB access or a separate tool.
- Must assemble components manually: SQLAlchemy (ORM), Alembic (migrations), auth middleware.
- Pydantic v2 has breaking changes from v1 — documentation and community examples are still catching up.
