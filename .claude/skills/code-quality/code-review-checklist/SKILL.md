---
name: code-review-checklist
description: Generate a customized code review checklist for Label Suite (FastAPI + React + TypeScript).
---

# Code Review Checklist

Generate a project-specific code review checklist tailored to the file type or module being reviewed.

## Usage

```
/code-review-checklist            # General checklist
/code-review-checklist api        # API endpoint checklist
/code-review-checklist scoring    # Scoring engine checklist (security-critical)
/code-review-checklist frontend   # React + TypeScript checklist
/code-review-checklist celery     # Celery task checklist
```

## General Checklist

```markdown
## General Code Review Checklist

### Naming & Readability
- [ ] Variables and functions use descriptive English names
- [ ] No single-letter variables (except loop counters `i`, `j`)
- [ ] Functions have a single responsibility (SRP)
- [ ] No hardcoded strings; use constants or config

### Type Safety
- [ ] Python: all function parameters and return types annotated
- [ ] TypeScript: no `any` type; use explicit interfaces
- [ ] Pydantic models used for all FastAPI request/response schemas
- [ ] React props defined with TypeScript interfaces

### Error Handling
- [ ] HTTP errors return appropriate status codes (400, 401, 403, 404, 422, 500)
- [ ] External API calls (Celery result fetch) wrapped in try/except
- [ ] User-facing error messages do not expose internal implementation details
- [ ] Frontend displays meaningful error states (not blank screen)

### Documentation
- [ ] Public functions have docstrings (Python) or JSDoc (TypeScript)
- [ ] Complex logic has inline comments explaining "why", not "what"
- [ ] All files are in English (no Chinese strings except README)

### Constitution
- [ ] KISS: No over-engineering for hypothetical future requirements
- [ ] YAGNI: No unused code, feature flags, or dead imports
- [ ] Config-driven: No hardcoded task type strings (use config YAML/JSON)
```

## API Endpoint Checklist

```markdown
## API Endpoint Checklist

### Request Validation
- [ ] Pydantic schema validates all input fields
- [ ] Path parameters validated (non-negative IDs, valid UUIDs)
- [ ] Query parameters have sane defaults and max limits (pagination)
- [ ] File upload endpoints validate MIME type and file size

### Authentication & Authorization
- [ ] Endpoint requires authentication (`Depends(get_current_user)`)
- [ ] Role check applied for admin-only endpoints (`require_role("administrator")`)
- [ ] Annotators cannot access other annotators' private data

### Response Schema
- [ ] `answer` field is NOT included in any annotator-facing response schema
- [ ] Response includes only fields defined in the Pydantic response model
- [ ] Sensitive fields (passwords, raw scores before leaderboard freeze) excluded
- [ ] Consistent response envelope: `{data: ..., meta: ...}` or plain model

### Security
- [ ] CORS is not set to `["*"]` (explicit origins only)
- [ ] Rate limiting configured for submission endpoints
- [ ] SQL injection prevention: ORM used (no raw string SQL)
- [ ] No `shell=True` in any subprocess calls

### OpenAPI / Documentation
- [ ] Endpoint has `summary` and `description` in route decorator
- [ ] Response models documented in schema
- [ ] Error responses documented (HTTPException examples)
```

## Scoring Engine Checklist

```markdown
## Scoring Engine Checklist (Security-Critical)

### Test-Set Leakage Prevention (NON-NEGOTIABLE)
- [ ] `answer` / `reference` / `gold_label` fields never returned in API responses
- [ ] Scoring function only accessible by Celery worker (not by annotator API)
- [ ] Test-set data fetched inside Celery task — never passed through user-facing API
- [ ] Scoring results stored to DB with task ID reference — no raw answers stored alongside user data
- [ ] Application logs do not emit test-set answer values

### Correctness
- [ ] Metric implementation matches the spec definition (F1, accuracy, BLEU, etc.)
- [ ] Edge cases handled: empty prediction, null values, mismatched lengths
- [ ] Floating-point precision: use `round()` with explicit decimal places
- [ ] Score normalization applied if required by task config

### Task Queue (Celery)
- [ ] Task is idempotent (safe to retry on failure)
- [ ] Task result TTL configured in Redis
- [ ] Task failure triggers status update to `failed` in DB
- [ ] Task does not hold DB connection open across long computations

### Testing
- [ ] Unit tests cover all metric variants defined in Constitution
- [ ] Test coverage ≥ 90% for scoring module
- [ ] Tests assert that `answer` is NOT present in any return value
- [ ] Boundary tests: all-correct, all-wrong, empty, single item
```

## Frontend Checklist

```markdown
## Frontend Checklist (React + TypeScript)

### Component Design
- [ ] Component has a single responsibility
- [ ] Props interface defined with TypeScript (no implicit `any`)
- [ ] Default props or optional props handled with `?` type
- [ ] No business logic in UI components (use hooks or services)

### Security
- [ ] No `dangerouslySetInnerHTML` usage
- [ ] User-provided content rendered as text, not HTML
- [ ] API tokens not stored in `localStorage` (use httpOnly cookies or memory)

### State Management
- [ ] Loading, success, and error states all handled
- [ ] No stale closure issues in `useEffect`
- [ ] Dependencies array in `useEffect` is complete

### Accessibility
- [ ] Interactive elements are keyboard-accessible
- [ ] Form fields have associated `<label>`
- [ ] Error messages linked to inputs with `aria-describedby`
- [ ] Color is not the only visual indicator (for colorblind users)

### Performance
- [ ] Large lists use virtualization (if > 100 items)
- [ ] Heavy components use `React.lazy` + `Suspense`
- [ ] `useCallback` / `useMemo` used only where measurable benefit exists
```

## Celery Task Checklist

```markdown
## Celery Task Checklist

### Task Design
- [ ] Task is idempotent (running twice produces the same result)
- [ ] Task has a meaningful name (`app.tasks.scoring.compute_score`)
- [ ] Task parameters are JSON-serializable (no ORM objects passed)
- [ ] Task result is stored with appropriate TTL

### Error Handling
- [ ] `max_retries` configured for transient failures
- [ ] `countdown` / `retry_backoff` configured for retry delay
- [ ] Permanent failures update submission status to `failed` in DB
- [ ] Task failure does not silently swallow exceptions

### Security
- [ ] Test-set answer not passed as task argument (fetch inside task)
- [ ] Task result does not include raw answer data

### Monitoring
- [ ] Task emits structured log on start, success, and failure
- [ ] Task tracks execution time with Prometheus or structured log
```
