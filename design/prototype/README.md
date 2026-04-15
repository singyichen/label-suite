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

## Serving the Prototype Manually

To browse the prototype in a browser without running tests, use the helper script from the **project root**:

```bash
./scripts/serve-prototype.sh          # serves at http://localhost:8888
./scripts/serve-prototype.sh 9000     # custom port
```

Then open `http://localhost:8888/pages/account/login.html` to start the demo flow.

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
│   ├── account/
│   │   ├── login.html
│   │   └── register.html
│   └── dashboard/
│       └── dashboard.html
├── shared/                   # Shared prototype-only utilities (not part of the real product)
│   └── proto-bar.js          # Role-switcher bar injected on every post-login page
├── tests/                    # Playwright spec files
│   ├── account/
│   │   ├── login.spec.ts     # spec 001 — Login
│   │   └── register.spec.ts  # spec 003 — Register
│   └── dashboard/
│       └── dashboard.spec.ts # spec 012 — Dashboard
├── playwright.config.ts      # Config: baseURL, webServer, browser projects
├── package.json
├── tsconfig.json
└── README.md
```

---

## Role-Based Demo Flow

The prototype simulates four distinct role views so the thesis advisor can walk through each user journey in a single browser session — no backend, no real auth required.

### Why This Approach

The real product uses a **two-layer role model**:

- **System role** (stored in JWT): `user` | `super_admin`
- **Task role** (resolved per task from `task_membership`): `project_leader` | `reviewer` | `annotator`

For demo purposes, the prototype collapses both layers into **four selectable role views**:

| Role key | Label | Represents |
|---|---|---|
| `project_leader` | 👑 專案負責人 | Task role — creates and manages labeling tasks |
| `annotator` | ✏️ 標記員 | Task role — performs the actual annotation work |
| `reviewer` | 🔍 審核員 | Task role — reviews and approves annotation results |
| `super_admin` | ⚙️ 系統管理員 | System role — platform-wide admin, user management |

### How It Works

**Step 1 — Login page** (`pages/account/login.html`)

The login form accepts email and password. On submit, the page navigates to the dashboard.

**Step 2 — Dashboard scenario switcher** (`pages/dashboard/dashboard.html`)

The dashboard includes a built-in **scenario pill bar** that lets the reviewer switch between role views without leaving the page:

```
[ 系統管理員 ]  [ 專案負責人 ]  [ 標記員 ]  [ 審核員 ]
```

Clicking a pill updates the role indicator and swaps the visible content section. The selected scenario is tracked in a JS variable (`let scenario`) — no `sessionStorage` needed.

### Design Decisions

| Decision | Rationale |
|---|---|
| Scenario switcher on dashboard, not at login | Lets the advisor switch views instantly during a walkthrough without re-logging in |
| JS variable for scenario state | Simpler than sessionStorage for single-page demos; resets on reload, avoiding stale state |
| DOM API only (no `innerHTML`) | Satisfies the project's OWASP security hooks even in prototype code |

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
| `tests/dashboard/dashboard.spec.ts` | `specs/dashboard/012-dashboard` | role rendering, scenario states, key CTA, language toggle, responsive layout |

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
