# Prototype Tests

Playwright E2E tests for Label Suite HTML prototypes.

Tests validate acceptance criteria from the SDD specs against static HTML pages — no backend required.

---

## Prerequisites

- Node.js 20+
- Python 3 (for the built-in HTTP server)

---

## Setup

```bash
cd design/prototype
npm ci
npx playwright install --with-deps chromium
```

> Run `npm ci` (not `npm install`) to reproduce the exact locked dependency tree.

---

## Running Tests

### Headless (default)

```bash
npm test
```

Playwright starts a Python HTTP server on port 8888, runs all tests against it, then shuts it down.

### Interactive UI mode

```bash
npm run test:ui
```

Opens the Playwright Test UI — useful for stepping through individual tests and inspecting page state.

### Headed (browser visible)

```bash
npm run test:headed
```

### Single file

```bash
npx playwright test tests/account/login.spec.ts
```

### Single test by title

```bash
npx playwright test -g "back-to-login link navigates to login.html"
```

---

## Type Check

```bash
npm run typecheck
```

Runs `tsc --noEmit` against all test files and `playwright.config.ts`. Run this before committing to catch TypeScript errors without a full test run.

---

## Project Structure

```
design/prototype/
├── pages/                    # Static HTML prototypes
│   └── account/
│       ├── login.html
│       └── register.html
├── tests/                    # Playwright spec files
│   └── account/
│       ├── login.spec.ts     # spec 001 — Login
│       └── register.spec.ts  # spec 003 — Register
├── playwright.config.ts      # Config: baseURL, webServer, browser projects
├── package.json
├── tsconfig.json
└── README.md
```

---

## How the Test Server Works

`playwright.config.ts` starts a Python HTTP server before each test run:

```
python3 -m http.server 8888 --bind 127.0.0.1
```

The server root is `design/prototype/`, so `pages/account/login.html` is reachable at:

```
http://localhost:8888/pages/account/login.html
```

The server is reused across local runs (`reuseExistingServer: true`) but always restarted fresh in CI.

---

## Test Coverage

Each spec file maps to one SDD spec. The file header lists exactly which user stories and functional requirements are covered.

| Test file | Spec | Coverage |
|---|---|---|
| `tests/account/login.spec.ts` | `specs/account/001-login-email-password` | US1.5, US1.6, US1.7, form validation, navigation |
| `tests/account/register.spec.ts` | `specs/account/003-register-email-password` | US1.1, US1.3, US2.1–US2.4, FR-009, FR-010 |

Tests that require a live backend (authentication flows, JWT handling) are documented in each file's header under "Tests NOT covered here."

---

## Adding a New Prototype Page

1. Create the HTML page at `pages/[module]/[page].html`
2. Add `data-testid` attributes to all interactive elements
3. Create the spec file at `tests/[module]/[page].spec.ts`
4. Add a row to the coverage table above

---

## CI

The CI pipeline runs two jobs for this directory (`.github/workflows/ci.yml`):

| Job | What it does |
|---|---|
| `prototype-typecheck` | `npm run typecheck` — catches TS errors in test files |
| `prototype-playwright` | `npm test` — runs all Playwright tests with Chromium |

Both jobs are skipped if `design/prototype/package.json` does not exist.

Artifacts (HTML test report) are uploaded under `prototype-playwright-results` on every run, including failures.

---

## Troubleshooting

**Port 8888 already in use**

```bash
lsof -ti:8888 | xargs kill -9
```

**Playwright browsers not installed**

```bash
npx playwright install --with-deps chromium
```

**Test fails because a page returns 404**

Some tests navigate to pages that are not yet implemented (e.g. `pending.html`, `forgot-password.html`). These are deferred — see the test file's "Tests NOT covered here" section. The tests that depend on these pages will fail until the pages are created.

**TypeScript errors in editor**

Make sure `node_modules` is installed (`npm ci`) — the editor's TypeScript server reads types from there.
