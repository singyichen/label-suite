# Prototype Tests

Playwright E2E tests for Label Suite HTML prototypes.

Tests validate acceptance criteria from the SDD specs against static HTML pages — no backend required.

---

## Prerequisites

- Node.js 20+ (also runs the bundled static test server)

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

Playwright starts the bundled Node static server (`tests/serve.mjs`) on port 8888, runs all tests against it, then shuts it down.

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

## Prototype Analytics (PostHog)

Prototype analytics is implemented via:

- `assets/analytics.js` (shared runtime)
- `assets/analytics.config.local.json` (local token, gitignored)

### 1. Create Local Config

Copy the example file and fill your dev token:

```bash
cp assets/analytics.config.example.json assets/analytics.config.local.json
```

```json
{
  "token": "phc_your_dev_token",
  "apiHost": "https://us.i.posthog.com",
  "version": "v1-dev"
}
```

> `analytics.config.local.json` is ignored by git, so dev tokens are not committed.

### 2. Add Analytics to a Page

In each HTML page (before `</body>`):

```html
<script src="../../assets/analytics.js"></script>
<script>
  window.LabelSuiteAnalytics.init({ page: 'dashboard' })
</script>
```

Update the `src` relative path based on page location (e.g. `../assets/analytics.js` if needed).

### 3. Track Events

Use shared helpers in page scripts:

```js
window.LabelSuiteAnalytics.track('prototype_lang_switched', {
  from_lang: 'zh',
  to_lang: 'en',
})

window.LabelSuiteAnalytics.bindClickTracks(
  [
    { id: 'userCreateTaskBtn', eventName: 'prototype_cta_clicked', extra: { cta: 'create_first_task' } },
  ],
  () => ({ scenario: 'project_leader' })
)

window.LabelSuiteAnalytics.trackPageView('dashboard', () => ({ lang: 'zh', scenario: 'user' }))
```

### 4. Localhost Behavior

`analytics.js` currently excludes local environments (`localhost`, `127.0.0.1`, `::1`, `.local`, private LAN IP ranges).

This means:

- You can still run/play the prototype locally.
- No analytics events are sent from local addresses.
- Use a non-local URL (e.g. GitHub Pages) when validating real event ingestion.

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
├── assets/                   # Shared analytics runtime + config template
│   ├── analytics.js
│   └── analytics.config.example.json
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

`playwright.config.ts` starts the zero-dependency Node static server before each test run:

```
node tests/serve.mjs
```

(It replaced `python3 -m http.server`, whose per-connection threading intermittently dropped sockets under parallel load and flaked unrelated tests.)

The server root is `design/prototype/`, so `pages/account/login.html` is reachable at:

```
http://127.0.0.1:8888/pages/account/login.html
```

The server is reused across local runs (`reuseExistingServer: true`) but always restarted fresh in CI.

---

## Test Policy

These five rules govern what may live in `tests/` (issue #1059).

1. **One test case maps to one current requirement or risk.** Every case must be traceable to a canonical `specs/[module]/NNN-feature/spec.md` FR/AC/SC, a security invariant, or a named regression risk. A case that pins a one-off migration step, a retired mechanism, or an internal implementation choice with no observable consequence does not qualify.
2. **Source, static and script tests do not belong in the browser suite.** A case that only reads source text, docs or config from disk, or shells out to a repo script, must run in a Node/static/script gate. The Playwright suite is for rendered prototype behavior only — every browser case costs a worker slot and CI wall-clock.
3. **Issue numbers are not permanent suite ownership.** `issue-NNN-*.spec.ts` is acceptable only as a short-lived Red container. Once the feature is archived, its surviving coverage folds back into the feature-oriented suite for the page it exercises, and the issue-named file goes away.
4. **A bug regression belongs in the canonical feature suite.** Add the guard to the existing suite for that page or feature rather than creating a new file named after the bug.
5. **The inventory is part of the suite.** See below.

### Test inventory

`tests/inventory.csv` is the authoritative, machine-readable record of every Playwright case: what it covers, how risky losing it would be, and whether it is staying.

| Column | Meaning |
|---|---|
| `file` | spec path relative to `design/prototype/tests/` |
| `case` | resolved Playwright case title (parametrized loops expanded) |
| `module` | owning module directory |
| `page` | prototype page(s) the file exercises |
| `layer` | `browser` · `node` · `static` · `script` |
| `traceability` | canonical `specs/**/spec.md` path + FR/AC/SC ids, or `SECURITY-INVARIANT: …`, or `REGRESSION-RISK: …`. A `DRIFT:<old> -> <canonical>` prefix marks a reference that still points at an archived `openspec/changes/` path |
| `risk` | `security` · `leakage` · `rbac` · `a11y` · `nav-status` · `p1-journey` · `data-fairness` · `data-correctness` · `ux-regression` · `impl-detail` · `infra` |
| `decision` | `keep` · `merge` · `move-out` · `delete` · `keep-uncertain` |
| `reason` | why — **mandatory for every non-`keep` decision** |

Two rules bind the inventory to the code:

- **A row whose `risk` is `security`, `leakage`, `rbac`, `a11y`, `nav-status`, `p1-journey` or `data-fairness` may never carry `decision=delete`.** If such a case looks obsolete, mark it `keep-uncertain` and record the open question in `reason`; a maintainer decides.
- **A PR that touches `design/prototype/tests/**` updates the matching inventory rows in the same PR** — adding a case adds a row, deleting one removes its row, renaming one updates `case`.

---

## Test Coverage

`tests/inventory.csv` is the authoritative coverage record — per-case traceability lives there, not in this file. Each spec file's header still lists the user stories and functional requirements it covers, and tests that require a live backend (authentication flows, JWT handling) are documented in each file's header under "Tests NOT covered here."

Suite size at the time of writing (issue #1059 baseline):

| Directory | Spec files | Cases |
|---|---:|---:|
| `tests/account/` | 10 | 142 |
| `tests/admin/` | 6 | 39 |
| `tests/annotation/` | 189 | 1047 |
| `tests/cross-role/` | 7 | 54 |
| `tests/dashboard/` | 13 | 90 |
| `tests/dataset/` | 19 | 114 |
| `tests/shared/` | 23 | 135 |
| `tests/task-management/` | 92 | 518 |
| `tests/` (root) | 1 | 6 |
| **Total** | **360** | **2145** |

---

## Adding a New Prototype Page

1. Create the HTML page at `pages/[module]/[page].html`
2. Add `data-testid` attributes to all interactive elements
3. Create the spec file at `tests/[module]/[page].spec.ts`
4. Add one `tests/inventory.csv` row per case, filling `traceability` and `risk`

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
