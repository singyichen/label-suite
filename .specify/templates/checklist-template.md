# [Checklist Type] Checklist: [FEATURE NAME]

**Purpose**: [What this checklist covers]
**Created**: [DATE]
**Feature**: [link to spec.md]

## Code Quality

- [ ] CHK001 Code conforms to Code Style guidelines (Python: ruff / TypeScript: ESLint)
- [ ] CHK002 All functions have type hints (Python) / TypeScript strict mode, no `any`
- [ ] CHK003 New or modified functions have docstrings / JSDoc in English
- [ ] CHK004 No leftover `print` / `console.log` debug statements

## Constitution Compliance

- [ ] CHK005 Task configuration is defined via Config, no hardcoded task logic
- [ ] CHK006 Test-set answers are not exposed to annotators
- [ ] CHK007 Scoring logic is covered by unit tests

## Testing

- [ ] CHK008 pytest tests pass (`uv run pytest`)
- [ ] CHK009 Playwright E2E tests pass (`pnpm playwright test`)
- [ ] CHK010 New feature test coverage meets target (80%+)

## Security

- [ ] CHK011 No hardcoded API keys or secrets
- [ ] CHK012 User inputs are validated and sanitized
- [ ] CHK013 CORS is configured correctly, no `allow_origins=["*"]`

## Documentation

- [ ] CHK014 README updated if necessary
- [ ] CHK015 Spec status updated to Completed

## Notes

- Check off completed items: `[x]`
- Add inline comments for any findings or issues
