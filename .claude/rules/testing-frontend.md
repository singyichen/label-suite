# Testing Rules — Frontend

## General

- TDD is required: write the failing test before writing implementation code
- Test files mirror source structure: `src/[module]/__tests__/[file].test.tsx`
- One assertion per logical behaviour; group related assertions in a single test only when they share setup

## Frontend (Vitest + Testing Library)

- Test behaviour, not implementation: query by role/label/text, not by CSS class or internal state
- Mock only at the network boundary (`msw` handlers); never mock React components or hooks directly
- Avoid `act()` wrappers manually — use `userEvent` which handles it automatically
- Snapshot tests are banned; they break silently and carry no intent

## Coverage

- New code must not decrease overall coverage
- Critical paths (auth, permission checks, score calculation) require ≥ 90% branch coverage
- Coverage report: `pnpm test --coverage`
