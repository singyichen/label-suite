# [Checklist Type] Checklist: [FEATURE NAME]

**Purpose**: [What this checklist covers]
**Created**: [DATE]
**Feature**: [link to `specs/[module]/NNN-feature/spec.md`]

## Code Quality

- [ ] CHK001 `[Principle: V]` Code conforms to Code Style guidelines (Python: ruff / TypeScript: ESLint)
- [ ] CHK002 `[Principle: V]` All functions have type hints (Python) / TypeScript strict mode, no `any`
- [ ] CHK003 `[Principle: VI]` New or modified functions have docstrings / JSDoc in English
- [ ] CHK004 `[Principle: V]` No leftover `print` / `console.log` debug statements

## Constitution Compliance

- [ ] CHK005 `[Principle: II]` Task configuration is defined via Config, no hardcoded task logic
- [ ] CHK006 `[Principle: III]` Test-set answers are not exposed to annotators
- [ ] CHK007 `[Principle: III]` Scoring logic is covered by unit tests

## Testing

- [ ] CHK008 `[Principle: IV]` pytest tests pass (`uv run pytest`)
- [ ] CHK009 `[Principle: IV]` Playwright E2E tests pass (`pnpm playwright test`)
- [ ] CHK010 `[Principle: IV]` New feature test coverage meets target (80%+)

## Security

- [ ] CHK011 No hardcoded API keys or secrets
- [ ] CHK012 User inputs are validated and sanitized
- [ ] CHK013 CORS is configured correctly, no `allow_origins=["*"]`

## Documentation

- [ ] CHK014 README updated if necessary
- [ ] CHK015 `[Principle: I]` Spec status updated to Completed

## Design Consistency

- [ ] CHK016 `[Principle: VII]` All new UI components use MASTER.md tokens (no hardcoded colors/spacing/font sizes)
- [ ] CHK017 `[Principle: VII]` Loading, error, empty, and disabled states implemented consistently across all new views
- [ ] CHK018 `[Principle: VII]` UI matches approved prototype screen(s); any deviation has a filed spec update

## Performance

- [ ] CHK019 `[Principle: VIII]` List-view endpoints use pagination; no unbounded queries
- [ ] CHK020 `[Principle: VIII]` API P95 response time verified ≤ 500ms for core labeling/annotation operations
- [ ] CHK021 `[Principle: VIII]` No N+1 query patterns introduced in new service-layer code

## Notes

- Check off completed items: `[x]`
- Add inline comments for any findings or issues

## Changelog

| Version | Date | Change Summary |
|---------|------|----------------|
| 1.1.1 | 2026-05-21 | Align feature spec link with module-based SDD directory structure |
| 1.1.0 | 2026-05-21 | 新增七八兩節與原則標籤 |
| 1.0.0 | [YYYY-MM-DD] | 初始版本 |
