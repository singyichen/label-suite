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

### Non-browser gate

```bash
npm run test:node
```

Runs `tests-node/` — the source/docs/config/script cases that open no browser (see Test Policy rule 2). Needs no server and no Chromium.

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

`tests-node/` is plain ESM JavaScript and is not in `tsconfig.json`'s `include`, so `typecheck` does not cover it; `pnpm test:node` is its only gate.

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
├── tests-node/               # Non-browser gate (`pnpm test:node`), *.test.mjs
├── resolve-port.mjs          # PW_PORT resolution, shared by the config and the gate
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
2. **Source, static and script tests do not belong in the browser suite.** A case that only reads source text, docs or config from disk, or shells out to a repo script, must run in a Node/static/script gate. The Playwright suite is for rendered prototype behavior only — every browser case costs a worker slot and CI wall-clock. That gate is `design/prototype/tests-node/`, run by `pnpm test:node` (stdlib `node:test` + `node:assert/strict`, no runner dependency); name files there `*.test.mjs`: `node --test` also collects `*-test.mjs`, `*_test.mjs`, `test-*.mjs` and `test.mjs`, but anything outside that set — `helpers.mjs`, `checks.mjs` — is silently not collected, so a test in a wrongly named file never runs and never goes red. The invocation is a bare `node --test` rather than `node --test tests-node`: Node 22 reads a positional argument as a glob and fails the directory form with `MODULE_NOT_FOUND`, while Node 20 accepts it, so the directory form is green in CI (which pins Node 20) and red locally. Bare discovery also recurses into subdirectories.
3. **Issue numbers are not permanent suite ownership.** `issue-NNN-*.spec.ts` is acceptable only as a short-lived Red container. Once the feature is archived, its surviving coverage folds back into the feature-oriented suite for the page it exercises, and the issue-named file goes away. This binds merges too: when an inventory row is marked `merge` and the surviving case currently lives in an issue-named file, the group executing that merge relocates the survivor into the canonical feature suite rather than leaving the issue-named file in place — a merge must not be a way of moving coverage out of the canonical suite.
4. **A bug regression belongs in the canonical feature suite.** Add the guard to the existing suite for that page or feature rather than creating a new file named after the bug.
5. **The inventory is part of the suite.** See below.

### Test inventory

`tests/inventory.csv` is the authoritative, machine-readable record of every prototype test case — browser and non-browser alike: what it covers, how risky losing it would be, and whether it is staying.

| Column | Meaning |
|---|---|
| `file` | test file path relative to `design/prototype/tests/`. A non-`browser` row lives outside that directory and therefore starts with `../`, e.g. `../tests-node/docs-fixtures.test.mjs` |
| `case` | resolved case title (parametrized loops expanded) — the `test(...)` title for a `browser` row, the `it(...)` title for a non-`browser` one |
| `module` | owning module directory |
| `page` | prototype page(s) the file exercises |
| `layer` | `browser` · `node` · `static` · `script` |
| `traceability` | canonical `specs/**/spec.md` path + FR/AC/SC ids, or `SECURITY-INVARIANT: …`, or `REGRESSION-RISK: …`. A `DRIFT:<old> -> <canonical>` prefix marks a reference that still points at an archived `openspec/changes/` path |
| `risk` | `security` · `leakage` · `rbac` · `a11y` · `nav-status` · `p1-journey` · `data-fairness` · `data-correctness` · `ux-regression` · `impl-detail` · `infra` |
| `decision` | `keep` · `merge` · `move-out` · `delete` · `keep-uncertain` |
| `reason` | why — **mandatory for every non-`keep` decision** |

**Two-way reconciliation — the inventory's core invariant.** The row set is no longer one suite's discovery output. It is the union of two, and each side must match exactly on `(file, case)`:

- rows whose `layer` is `browser` must match, case for case, what `PW_PORT=<port> pnpm playwright test --list` discovers;
- rows whose `layer` is **not** `browser` (`node` · `static` · `script`) must match, case for case, what `pnpm test:node` discovers.

Compare as a **multiset**, not a plain set: a spec file may legitimately hold two cases with the identical title (12 `(file, case)` keys do today, 23 extra occurrences in total), and the inventory then holds one row per occurrence. Plain set equality would hide one of those rows going missing, so the check is per-key counts in both directions.

A row matching neither discovery set is drift; a discovered case with no row is untracked coverage. Because `file` always resolves relative to `design/prototype/tests/`, the `../tests-node/` prefix tells a reader which discovery set a row belongs to without trusting `layer` alone.

Moving a case between the two gates is a migration, not a deletion: the row survives, `file` and `layer` follow the case, and `reason` records where it came from. Issue #1059 group 2 did exactly this for 35 cases.

Three rules bind the inventory to the code:

- **A row whose `risk` is `security`, `leakage`, `rbac`, `a11y`, `nav-status`, `p1-journey` or `data-fairness` may never carry `decision=delete`.** If such a case looks obsolete, mark it `keep-uncertain` and record the open question in `reason`; a maintainer decides.
- **`risk` is a case-level attribute, not a file-level one.** When an inventory row was seeded from a whole-file default — one suite treated as a single protected concern — that default is only a seeding convenience, never a standing grant of protection: if a file's cases actually cover more than one concern, each row must carry the risk its own case tests, and the no-delete rule above is evaluated per row against that case-level value. A file-level floor must not shelter a case whose own risk is not itself protected. Issue #1068 found 8 rows in `account/auth-chrome-consistency.spec.ts` carrying the file's `a11y` floor while actually pinning an unrelated CSS token or inline-style absence; they were re-tagged to the risk their case tests (`impl-detail` / `ux-regression`) without changing `decision`.
- **Every citation in `traceability` must resolve to a _live_ clause by `grep`.** Each FR/AC/SC id must appear in at least one of the canonical `specs/**/spec.md` paths cited in the same row, and a row that cites an id must cite a path. A bare grep hit is not enough: **an id whose only match in the cited spec falls inside that spec's `## Changelog` section is retired** — the hit is a history row about something that was removed, not a requirement — and such a row must re-point to the live clause, or drop the id and state the coverage as `REGRESSION-RISK: …` instead (use `DRIFT:` only when the retired reference is an archived `openspec/changes/` path). Note that archiving *moves* a change rather than deleting it: a cited `openspec/changes/<change>/<tail>` normally still exists as `openspec/changes/archive/<YYYY-MM-DD>-<change>/<tail>`, so such a reference is a missing path segment, not a vanished file — it is re-anchored to `specs/` because `specs/` is the SSoT (ADR-033), not because the delta is gone. Ids named inside a `REGRESSION-RISK: …` or `SECURITY-INVARIANT: …` clause are prose, not citations, and are not checked. A `DRIFT:` clause is **not** exempt: the ids after its `-> <canonical>` arrow are ordinary citations and are checked. A checker that skips whole `DRIFT:` clauses under-reports — that mistake hid 7 dangling `FR-082` citations during issue #1059 group 6a until an independent review caught it. Never approximate an id, and never fix one by dropping the path. The `DRIFT:<old> -> <canonical>` prefix is mandatory for every test file that still references an `openspec/changes/` path, so the set of distinct `DRIFT:`-marked files equals the union of `grep -rl "openspec/changes" tests --include='*.spec.ts'` and `grep -rl "openspec/changes" tests-node` — both gates, since a migrated case carries its citation across; the `<old>` side is the reference verbatim as the test file writes it. Issue #1059 group 6a emptied both sides — 244 rows across 38 files were re-anchored to the canonical `specs/[module]/NNN-feature/spec.md` that *defines* their ids, so `grep -rl "openspec/changes"` over `tests/` and `tests-node/` and `grep "DRIFT:" tests/inventory.csv` both return nothing today. The prefix stays specified because the next change that cites a delta before archiving needs it; an empty set is the steady state, not a dead mechanism. A **group prefix is not an id.** A bare `AC-N` (`AC-1` … `AC-6`) or a sub-family `AC-NL` (`AC-2A`, `AC-2B`) names a spec's whole `AC-N.x` / `AC-NL.x` family and has no clause head of its own — `specs/dataset/017-dataset-analysis-detail/spec.md` carries ten `AC-2.x` heads and no bare `AC-2`, and `specs/annotation/015-annotation-workspace/spec.md` defines `AC-2A.1` and `AC-2A.2` but never `AC-2A`. These two forms are therefore exempt from the per-id clause-head check; 623 rows carry a bare `AC-N`, 13 carry `AC-2A` and 2 carry `AC-2B`, all of them predating issue #1059 group 6a, which added none. Exempt by **form, not by string**: an id-extraction regex that stops at the digits will silently read a real `AC-2A.1` head as a bare `AC-2`, so a checker that special-cases the literal `AC-2` masks a genuine miss. Narrowing these rows to the exact `AC-N.x` each case asserts is a separate pass and is not part of issue #1059.
- **A PR that touches `design/prototype/tests/**` or `design/prototype/tests-node/**` updates the matching inventory rows in the same PR** — adding a case adds a row, deleting one removes its row, renaming one updates `case`, moving one between the two gates updates `file` and `layer`.

---

## Test Coverage

`tests/inventory.csv` is the authoritative coverage record — per-case traceability lives there, not in this file. Each spec file's header still lists the user stories and functional requirements it covers, and tests that require a live backend (authentication flows, JWT handling) are documented in each file's header under "Tests NOT covered here."

Suite size after issue #1059 group 6b (the baseline was 360 files / 2145 cases; group 2 moved 35 non-browser cases to the Node gate, emptying and removing 3 spec files; group 3 deleted 14 implementation-detail cases from 2 `tests/account/` files, which stay because each keeps surviving cases; group 4 folded 15 design-system `issue-NNN-*.spec.ts` files — 49 cases across admin, annotation, dataset and task-management — into the single table-driven `tests/shared/design-system-a11y-contract.spec.ts`, deleting 9 implementation-detail cases and carrying the surviving 40 `(page, selector, theme)` contract rows into 12 scenarios; group 5 folded 7 overlapping sidebar-i18n files — 39 cases, all of them `keep` or `merge` and none deletable — into `tests/shared/sidebar-i18n.spec.ts` as a 23-cell `(page, role, language)` matrix plus 7 scenarios whose observables are not label tuples, deleting nothing and raising `(page, role, language, label)` coverage from 137 tuples to 192; group 6b folded the matrix's 19 remaining `decision=merge` rows — 18 in `tests/annotation/`, 1 in `tests/task-management/`, across 7 source files and 7 clusters (C1-C7) — into their named survivors, deleting no spec file; two clusters (C2, C7) landed in a canonical destination that did not already duplicate the content, so 3 new rows were added there, netting -16 cases rather than the naive -19):

**Browser suite** — `pnpm playwright test`, reconciles against `layer=browser` rows:

| Directory | Spec files | Cases |
|---|---:|---:|
| `tests/account/` | 10 | 128 |
| `tests/admin/` | 2 | 29 |
| `tests/annotation/` | 185 | 1007 |
| `tests/cross-role/` | 7 | 54 |
| `tests/dashboard/` | 13 | 90 |
| `tests/dataset/` | 18 | 113 |
| `tests/shared/` | 18 | 134 |
| `tests/task-management/` | 84 | 479 |
| **Total** | **337** | **2034** |

**Node gate** — `pnpm test:node`, reconciles against the `node` / `static` / `script` rows:

| File | Layer | Cases |
|---|---|---:|
| `tests-node/annotation-workspace-source.test.mjs` | static | 5 |
| `tests-node/demo-data-parity.test.mjs` | script | 5 |
| `tests-node/docs-fixtures.test.mjs` | static | 8 |
| `tests-node/resolve-port.test.mjs` | node | 6 |
| `tests-node/shared-page-contracts.test.mjs` | static | 4 |
| `tests-node/task-detail-source.test.mjs` | static | 7 |
| **Total** | | **35** |

Node-gate files are named after the artifact their cases scan, not after the spec file they came from: the mutation that proves a guard still fails has to touch that artifact, and naming by subject keeps that mapping easy to follow. Five of the six hold to one artifact each. `shared-page-contracts.test.mjs` is the exception — its four cases scan eight page shells, `assets/tokens.css` and one deliberately absent page — so it is grouped by gate rather than by artifact, and its file header says so.

---

## Adding a New Prototype Page

1. Create the HTML page at `pages/[module]/[page].html`
2. Add `data-testid` attributes to all interactive elements
3. Create the spec file at `tests/[module]/[page].spec.ts`
4. Add one `tests/inventory.csv` row per case, filling `traceability` and `risk`

---

## CI

The CI pipeline runs three jobs for this directory (`.github/workflows/ci.yml`):

| Job | What it does |
|---|---|
| `prototype-typecheck` | `npm run typecheck` — catches TS errors in test files |
| `prototype-node-tests` | `npm run test:node` — runs the non-browser gate (`tests-node/`) |
| `prototype-playwright` | `npm test` — runs all Playwright tests with Chromium |

All three jobs are skipped if `design/prototype/package.json` does not exist.

Artifacts (HTML test report) are uploaded under `prototype-playwright-results` on every run, including failures.

### CI measurement after issue #1059

Issue #1059 (G1-G7) consolidated the prototype Playwright suite — 360 files / 2145 cases at the pre-#1059 baseline down to **337 files / 2034 cases** — and converted or removed fixed waits and undocumented `retries`. G8 measured the `prototype-playwright` job on `main` at `432b53d3` (the commit right after G7 merged; CI run `36873754996`, rerun three times via `gh run rerun` since `ci.yml` has no `workflow_dispatch` trigger):

| Run attempt | `Prototype — Playwright Tests` job wall-clock | `Run Playwright tests` step |
|---|---|---|
| 1 | `2026-10-01T14:35:29Z` → `14:54:51Z` = 19m22s | `14:36:13Z` → `14:54:45Z` = 18m32s |
| 2 | `2026-10-01T14:55:43Z` → `15:15:07Z` = 19m24s | `14:56:23Z` → `15:15:03Z` = 18m40s |
| 3 | `2026-10-01T15:15:58Z` → `15:35:27Z` = 19m29s | `15:16:37Z` → `15:35:23Z` = 18m46s |
| **Median** | **19m24s (1164s)** | **18m40s (1120s)** |

**Verdict against both acceptance criteria:**

- **Case count ≤ 1,700**: not met. 2,034 cases (337 files) is 334 above the target. Every remaining case traces to a canonical FR/AC/SC, a security/RBAC/a11y/navigation invariant, or a named regression risk per the G1-G6b inventory; none of the remaining case count is deletable coverage left un-pruned — the gap is a scope mismatch between the issue's numeric target and its own non-goals (the six large clusters and all protected-risk cases were locked as non-deletable from G1 onward), not an unfinished cleanup.
- **CI job wall-clock ≤ 14 min**: not met. The median 19m24s job / 18m40s step both exceed the target by roughly 5-5.5 minutes. This did **not** improve alongside the local full-suite run, which dropped from 14.9 min (G6b) to 10.6 min (G7) after G7's wait/retry cleanup — CI wall-clock instead went slightly *up* across the same window (G6b CI: ~16.4 min; G7 CI: ~17.4 min; G8 median: ~19.4 min). The most likely explanation is runner contention: all three G8 measurement runs, and the G6b/G7 CI runs they are compared against, ran during a period of heavy concurrent CI activity from this same multi-group dispatch wave (several other issues' PRs merging to `main` in the same windows, sharing the same `ci.yml` concurrency group and GitHub-hosted runner pool) — a local run has no such queueing/contention cost. This is recorded as the leading hypothesis, not a confirmed root cause: no isolated, uncontended CI run was available to measure during G8 to test it directly.

Remaining candidates for a future pass, not pursued in #1059 per "do not chase the number by deleting coverage": the 23 `keep-uncertain` rows (`account/auth-chrome-consistency.spec.ts` / `account/auth-dark-drift.spec.ts`), re-examining `<1s` fixed waits, and re-verifying whether the 20 *documented* `retries: 2` files (left untouched in G7) still need their stated flake protection.

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
