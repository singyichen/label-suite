# ADR-014: Prototype-Layer Playwright Testing — Static HTML as Spec Validation

**Status**: Accepted
**Date**: 2026-04-07

## Context

This project follows a design-first development pipeline:

```
specs/ (Given-When-Then AC)
  → design/wireframes/ (Pencil .pen)
    → design/prototype/ (HTML/CSS/JS)
      → frontend/ (React + TypeScript)
```

Each stage produces a concrete artifact. The gap between the `design/prototype/` layer and the `frontend/` layer was previously unvalidated: spec acceptance criteria were written in `specs/[module]/NNN-feature/spec.md` but were not exercised until React implementation was complete. This meant:

1. **Late feedback loop** — broken behaviors in the prototype were not caught until the React layer was built, or not at all.
2. **Selector inconsistency** — the React E2E tests in `frontend/tests/` had no shared contract with the prototype, so `data-testid` names were invented independently during React development.
3. **Spec drift** — acceptance criteria written in prose (Given-When-Then) had no executable equivalent, making it hard to confirm whether the prototype correctly implemented the spec.

The project already mandates TDD (ADR-009) and has a full Playwright E2E suite planned for `frontend/tests/` (ADR-012). The question was whether the prototype layer warranted its own test suite, and if so, how to structure it without duplicating infrastructure.

### Prototype Characteristics

| Property | Value |
|----------|-------|
| Technology | Static HTML + vanilla JS (`design/prototype/`) |
| Server | Python `http.server` (existing `scripts/serve-prototype.sh`) |
| State simulation | Client-side only — no backend calls; errors/success simulated in JS |
| Scope | Design validation and stakeholder review, not production code |

### Acceptance Criteria Structure in Spec Files

Each `spec.md` contains structured Given-When-Then scenarios:

```
Given [precondition], When [user action], Then [system response]
```

These map directly to Playwright `test()` blocks and form the basis of the prototype test suite.

---

## Decision

Write **Playwright tests against the static HTML prototype layer** under `design/prototype/tests/`. Each test maps 1-to-1 to a spec acceptance criterion.

### Infrastructure

| File | Purpose |
|------|---------|
| `design/prototype/package.json` | Standalone Node package; `@playwright/test` only |
| `design/prototype/playwright.config.ts` | Config pointing at `tests/`; `webServer` starts Python HTTP server on port 8888 |
| `design/prototype/tests/[module]/[page].spec.ts` | Test files mirroring `specs/[module]/NNN-feature/` |

The `design/prototype/` package is intentionally **separate from `frontend/`**: prototype tests are a design-layer artifact, not production test infrastructure. They do not share `tsconfig`, `vite.config`, or msw mocks with the frontend.

### `data-testid` Shared Contract

All interactive elements in prototype HTML files are annotated with `data-testid` attributes. These same `data-testid` values are reused verbatim in React component implementations and in `frontend/tests/`. This establishes a shared selector contract across all three layers:

```
design/prototype/pages/account/register.html
  → data-testid="email-input"

frontend/src/features/account/components/RegisterForm.tsx
  → <input data-testid="email-input" ... />

frontend/tests/auth/register.spec.ts
  → page.getByTestId('email-input')
```

The `data-testid` naming convention is `[element-type]` or `[purpose]-[element-type]` in kebab-case (e.g., `email-input`, `submit-btn`, `error-banner`, `lang-toggle`).

### Navigation Test Convention

All tests that click a link or trigger a redirect must assert the response status alongside the URL. Checking only the URL is insufficient — a 404 response still changes the URL and passes a `toHaveURL()` assertion.

```ts
// ✗ Wrong — passes even when the target page returns 404
await page.getByTestId('register-link').click();
await expect(page).toHaveURL(/register\.html/);

// ✓ Correct — intercepts the response and asserts HTTP 200
const [response] = await Promise.all([
  page.waitForResponse(res => res.url().includes('register.html')),
  page.getByTestId('register-link').click(),
]);
expect(response.status()).toBe(200);
await expect(page).toHaveURL(/register\.html/);
```

This applies to all navigation tests: link clicks, form-submission redirects, and any other action that causes the browser to load a new page. The target HTML file must exist before the test is expected to pass.

### Test Scope

Prototype Playwright tests cover **only what the static HTML prototype can validate**:

| In scope | Out of scope |
|----------|-------------|
| Required UI elements present | Authenticated routes / JWT logic |
| Client-side form validation (required, format, match, length) | Backend API responses |
| Navigation between prototype pages | Role-based redirects |
| i18n language toggle (immediate, no reload) | Session state persistence |
| Responsive rendering (no horizontal overflow at 375px / 768px / 1440px) | SSO OAuth flows |
| Simulated server-error display (hardcoded in prototype JS) | Database operations |

Tests that require a running backend are explicitly **excluded and documented** in each spec file with a comment block at the top.

### TDD Workflow for Prototype Tests

Follow the Red-Green-Refactor cycle adapted for static HTML:

1. **Red** — Write `*.spec.ts` using `getByTestId()` selectors. Run tests; they fail because `data-testid` attributes are not yet in the HTML.
2. **Green** — Add `data-testid` attributes to the HTML prototype. Run tests; they pass.
3. **Refactor** — Adjust test descriptions to precisely match the spec acceptance criterion wording; keep tests green.

This confirms that `data-testid` selectors are both present and correctly target the intended elements.

### Test File Structure

```
design/prototype/
├── package.json                          # @playwright/test only
├── playwright.config.ts                  # webServer: python3 -m http.server 8888
└── tests/
    └── account/
        ├── login.spec.ts                 # spec 001 (US1.5, US1.6, US1.7, form validation, navigation)
        └── register.spec.ts             # spec 003 (US1.1, US1.3, US2.1–US2.4, FR-009, FR-010)
```

New spec files are added under `tests/[module]/` as their corresponding prototype pages are built. The test file name matches the HTML page name.

### Running Tests

```bash
# From design/prototype/
npm test                    # headless Chromium
npm run test:headed         # with browser window (debugging)
npm run test:ui             # Playwright UI mode

# Or from project root via the static server:
./scripts/serve-prototype.sh    # http://localhost:8888
```

---

## Consequences

### Easier

- **Early spec validation** — acceptance criteria are executable before React development begins; spec gaps (e.g., missing simulated states) are caught at the prototype stage.
- **Selector reuse** — `data-testid` attributes defined in the prototype HTML become the authoritative selector names for React components. React developers do not invent new names.
- **Living documentation** — `tests/account/login.spec.ts` makes `specs/account/001-login-email-password/spec.md` US1.5–1.7 directly executable; the test is the spec.
- **Fast feedback** — the full prototype suite (32 tests) runs in under 10 seconds against a Python HTTP server with no Docker or database dependencies.
- **Regression guard** — if a prototype page is edited (e.g., an element is renamed or removed), the test catches the breakage before stakeholder review.

### Harder

- **Two `package.json` for Playwright** — `design/prototype/package.json` and `frontend/package.json` each have `@playwright/test`. Playwright version must be kept in sync manually.
- **Prototype–spec drift** — if a `spec.md` acceptance criterion changes after a test is written, the test must be updated to match. There is no automated link between the two files.
- **Partial coverage** — backend-dependent scenarios (e.g., "Given already-logged-in user → redirect to /dashboard") cannot be tested at this layer and must wait for `frontend/tests/`. Developers must be aware of which scenarios each layer covers.
- **Migration cost** — when the React implementation is complete, prototype tests are not deleted but serve as a reference for porting to `frontend/tests/` via the shared `data-testid` contract. Maintenance burden is low once ported.

### Relationship to ADR-009 and ADR-012

| ADR | Rule | This ADR's Role |
|-----|------|-----------------|
| ADR-009 | TDD — write tests before code | Prototype tests are written before `data-testid` attributes are added to HTML (Red-Green-Refactor at the design layer) |
| ADR-009 | Playwright for core user flows | Prototype Playwright tests are the precursor to `frontend/tests/`; they share the same selector contract |
| ADR-012 | `data-testid` for React E2E selectors | `data-testid` values are first defined here and reused in React components and `frontend/tests/` |

### Alternatives Rejected

| Option | Reason Rejected |
|--------|-----------------|
| No prototype tests; test only the React layer | Late feedback loop — spec errors discovered only after React implementation, increasing rework cost |
| Manual QA checklist against prototype | Not repeatable; does not catch regressions when prototype is revised; not executable |
| Cypress instead of Playwright | ADR-009 already mandates Playwright; no reason to introduce a second E2E framework |
| `frontend/tests/` tests that target `localhost:8888` | Mixes design-layer and production-layer test infrastructure; `frontend/playwright.config.ts` points at the React dev server, not the static server |
| Playwright in project root (single config) | Requires the static server and the React dev server to coexist; complicates CI; violates separation between design artifacts and production code |
