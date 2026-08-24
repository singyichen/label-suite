# ADR-034: Formal E2E Test Directory — Root `e2e/[module]/`

**Status**: Proposed
**Date**: 2026-08-24
**Supersedes in part**: ADR-009 (Test Categories table, Consequences → Easier), ADR-011 (Playwright Test Structure), ADR-012 (Decision two-layer table, E2E Testing (Playwright), E2E Coverage Matrix)

## Context

The repository carries **two contradictory canons** for where formal (full-stack) Playwright E2E tests live:

| Source | Line | Statement |
|---|---|---|
| `docs/adr/009-testing-strategy.md` | 101 | Test Categories table — E2E (core user flows) → `frontend/tests/` |
| `docs/adr/009-testing-strategy.md` | 121 | "Playwright TypeScript tests co-locate with the frontend (`frontend/tests/`) and share type definitions." |
| `docs/adr/011-frontend-source-structure.md` | 422 | "E2E tests live in `frontend/tests/` organized by **user journey**, not by page or feature." |
| `docs/adr/012-frontend-testing-strategy.md` | 29 | Decision two-layer table — E2E (User Journey) → `frontend/tests/` |
| `docs/adr/012-frontend-testing-strategy.md` | 373 | "Full `frontend/tests/` structure:" |
| `specs/_governance/testing-constitution.md` | 56 | "Frontend E2E tests must use Playwright under `e2e/[module]/`." |
| `specs/_governance/frontend-constitution.md` | 93 | "E2E tests use Playwright under `e2e/[module]/`." |
| `.claude/rules/testing-e2e.md` | 10 | "E2E tests live in `e2e/` at the repo root; mirror page structure: `e2e/[module]/[page].spec.ts`" |

The governance gap is structural, not cosmetic: `specs/_governance/testing-constitution.md:3` names `docs/adr/009-testing-strategy.md`, `docs/adr/012-frontend-testing-strategy.md`, and `docs/adr/014-prototype-playwright-testing.md` as its **source of truth**, then contradicts all three on this exact path. Issue #180's review recorded this as W1 §3.4 and escalated it for user decision.

### Decision D1 (2026-08-18) — what was already settled

`docs/product/e2e/issue-180/phase2-decision-list.md` records the user ruling on D1 as **延後** (deferred), with a scope fence and a required artifact:

> 使用者指出本輪僅針對 prototype 檢查；本輪測試一律留在 `design/prototype/tests/`（ADR-014 正典，無衝突）。`frontend/tests/` vs `e2e/[module]/` 之爭僅影響未來正式全端 E2E，改立獨立 `[Task]` issue 於正式實作前決議（主 agent 建議傾向 `e2e/[module]/`，與 testing-constitution 及 `.claude/rules/testing-e2e.md` 一致），並需新 ADR 記錄理由

The same document's D1 conflict entry adds the binding constraint: 「無論選哪邊，都需要一份新 ADR 或治理 changelog 記錄決策理由，不能只改路徑字串」 — a path-string edit alone is not an acceptable resolution. This ADR is that record. Issue #203 is the `[Task]` issue it names.

### What the acceptance plan already assumes

`docs/product/e2e/cross-role-task-lifecycle-playwright-plan.md` §2 states the layering explicitly:

> issue #180 原文「各角色獨立 BrowserContext／storage state」的隔離語意，屬於未來**正式全端 E2E**（真 JWT session，`.claude/rules/testing-e2e.md` 的 `storageState` fixtures）的正確做法；prototype 層若照做反而製造假斷裂。

That sentence assigns per-role `storageState` isolation to the formal full-stack layer **and names `.claude/rules/testing-e2e.md` as the governing rule for it** — a file whose `paths:` frontmatter is scoped to `e2e/**`. The plan further reserves for the formal layer: six failure scenarios that cannot run at the prototype layer (§6 — `FAIL-D01～D06`：API 逾時／網路錯誤／5xx／JWT 過期／Celery 失敗／樂觀鎖), backend API-layer and access-control data-fairness verification (§8.6 — 「後端 API 層與存取控制層屬正式 E2E」), and the audit-trail lifecycle reconstruction that `docs/adr/032-user-action-audit-trail.md:123` explicitly defers to "the formal E2E suite".

Every one of those requires a running FastAPI backend, PostgreSQL, Redis, and Celery — not a frontend dev server.

### Current repository state

`frontend/` and `backend/` **do not yet exist** in the repository (`.github/workflows/ci.yml` gates every layer job on `[ -f "backend/pyproject.toml" ]`, `[ -f "frontend/package.json" ]`, `[ -f "design/prototype/package.json" ]`, and carries `# TODO: Playwright E2E tests will be added once frontend development begins`). The migration cost of either option is therefore **zero**; this decision is about which canon survives, not about moving files.

## Options Evaluated

### Option A — `frontend/tests/` (current ADR-009 / 011 / 012 canon)

| Dimension | Assessment |
|---|---|
| Monorepo layout | E2E becomes a subdirectory of one layer. ADR-001's decision diagram lists `frontend/`, `backend/`, `docker-compose.yml`, `specs/`, `.github/workflows/` as peers; a cross-layer suite nested under `frontend/` is the only artifact that spans layers while living inside one. |
| CI job separation | The E2E job must install from `frontend/package.json`, so Playwright browsers, backend service containers, and seed tooling attach to the same dependency graph as `pnpm build` / `pnpm lint` / Vitest. ADR-009:130 already warns Playwright "must be run selectively in CI to avoid blocking PR feedback" — harder to schedule independently when the package is shared. |
| `storageState` fixture sharing | ADR-012:330 hardcodes `storageState: 'tests/shared/fixtures/.auth/project-leader.json'` — a path resolved relative to the frontend package root. Real-JWT auth artifacts produced by logging into the backend end up inside the frontend package tree. |
| Full-stack orchestration | The suite's `webServer` / compose orchestration must start backend + DB + Redis + Celery from a config owned by the frontend package. |
| Alignment with plan §2 | Contradicts it: §2 routes formal `storageState` fixtures to `.claude/rules/testing-e2e.md`, which mandates root `e2e/`. |
| **Genuine advantages** | One Node toolchain instead of two. `tsconfig` path aliases (`@/shared/…`, ADR-012:492) and generated API types resolve without cross-package references. No fourth `package.json` / lockfile to maintain. |

### Option B — Root `e2e/[module]/` (selected)

| Dimension | Assessment |
|---|---|
| Monorepo layout | E2E is a peer of `frontend/` and `backend/`, matching what it actually tests. It mirrors the existing precedent of `design/prototype/` — ADR-014:59 already established that a Playwright package with a different subject deliberately lives outside `frontend/`: "The `design/prototype/` package is intentionally **separate from `frontend/`**". |
| CI job separation | A root `e2e/package.json` gives the job its own existence guard, install step, and cache key in the pattern `.github/workflows/ci.yml` already uses per layer. The slow E2E job is then schedulable independently of the fast `frontend-lint` job without touching frontend tooling. |
| `storageState` fixture sharing | `e2e/shared/fixtures/.auth/` is layer-neutral: the states are produced against the real backend and consumed by a suite that belongs to neither layer. The role fixture set is unchanged from ADR-012 (`asProjectLeader`, `asAnnotator`, `asReviewer`, `asSuperAdmin`, `asUnauthenticated`). |
| Full-stack orchestration | The E2E package owns its own compose/`webServer` bring-up of backend + frontend + PostgreSQL + Redis + Celery — the only package whose job is to run all of them. |
| Alignment with plan §2 | Direct: `.claude/rules/testing-e2e.md` loads on `e2e/**` and is exactly the rule §2 designates for formal-layer `storageState` fixtures. |
| **Cost** | A fourth `package.json` + lockfile. Shared types must be imported across packages (relative `tsconfig` project reference to `frontend/`) rather than via a local alias. |

### Tooling and governance already point at Option B

This is the tiebreaker, and it is asymmetric:

- `CLAUDE.md` routes rules by path — "`e2e/**` → `testing-e2e.md`". A `paths:` glob for `e2e/**` already exists in `.claude/rules/testing-e2e.md:3`. Under Option A, that rule file **never loads** for the formal suite, silently taking its `getByRole()`-over-CSS mandate, `storageState` mandate, and no-hardcoded-port mandate out of effect; the glob would have to be rewritten to `frontend/tests/**`.
- Choosing Option B requires **zero** governance edits: `testing-constitution.md:56`, `frontend-constitution.md:93`, and `.claude/rules/testing-e2e.md:10` already say `e2e/[module]/`. Choosing Option A would require editing all three plus the rules glob — amending two constitutions to match three ADR paragraphs that describe a directory nobody has created yet.
- The issue #180 main agent's standing recommendation was already `e2e/[module]/` (`phase2-decision-list.md`, D1 決策紀錄).

## Decision

**Formal full-stack E2E tests live at the repository root under `e2e/[module]/[page].spec.ts`.**

```text
label-suite/
├── frontend/                  ← React + Vite; Vitest component tests co-located (ADR-012, unchanged)
├── backend/                   ← FastAPI; pytest under backend/tests/ (ADR-009, unchanged)
├── design/prototype/tests/    ← prototype-layer Playwright (ADR-014, unchanged)
└── e2e/                       ← formal full-stack Playwright (this ADR)
    ├── package.json
    ├── playwright.config.ts
    ├── account/
    ├── dashboard/
    ├── task-management/
    ├── annotation/
    ├── dataset/
    ├── admin/
    └── shared/
        ├── fixtures/          ← per-role storageState (.auth/*.json), seed helpers
        └── page-objects/
```

Binding rules:

1. **Module directories** use the canonical module names from `CLAUDE.md` (`account` · `dashboard` · `task-management` · `annotation` · `dataset` · `admin`), aligning `e2e/[module]/` with `specs/[module]/` and `design/prototype/tests/[module]/`.
2. **`.claude/rules/testing-e2e.md` governs this directory** unchanged — `getByRole()`/`getByLabel()`/`getByText()` over CSS selectors, `storageState` fixtures instead of per-test login, and `baseURL` from `playwright.config.ts` instead of hardcoded ports.
3. **Per-role `storageState` isolation applies here and only here.** Per the acceptance plan §2 layering statement, one `BrowserContext` per role with a real JWT session is correct at this layer; the prototype layer keeps its single shared context, and prototype `storageState` remains limited to one-time fixture seeding.
4. **ADR-012's fixture pattern and coverage matrix carry over verbatim** apart from the path: the five role fixtures, the Page Object Model layout, and the journey-to-spec-file mapping are unchanged. Only `frontend/tests/` → `e2e/` and `tests/shared/fixtures/.auth/` → `shared/fixtures/.auth/`.
5. **The `data-testid` shared contract (ADR-014) is unchanged.** It now spans `design/prototype/pages/` → `frontend/src/features/` → `e2e/`. Note this does not weaken `.claude/rules/testing-e2e.md`'s preference for semantic locators: `data-testid` remains the fallback when no semantic alternative exists.
6. **Vitest component tests stay co-located in `frontend/src/`.** This ADR changes nothing about ADR-012's component layer.
7. **The root `e2e/` directory must not be created until this ADR is Accepted.** Issue #203 forbids it pre-decision, and this ADR is Proposed.

### Superseded Sections

The following paragraphs cease to be canon on acceptance. The surrounding ADRs remain in force in every other respect; the affected files carry an in-place supersession note rather than a rewrite, preserving ADR immutability (`docs/adr/README.md:7`).

| ADR | Section | Superseded statement |
|---|---|---|
| ADR-009 | Test Categories (table row, line 101) | E2E location `frontend/tests/` → `e2e/[module]/` |
| ADR-009 | Consequences → Easier (line 121) | "co-locate with the frontend (`frontend/tests/`) and share type definitions" — co-location rationale no longer holds; type sharing is now a cross-package `tsconfig` reference |
| ADR-011 | Playwright Test Structure (lines 418–452) | "E2E tests live in `frontend/tests/`" and the directory tree; the journey-based organisation **survives**, only the root changes |
| ADR-012 | Decision two-layer table (line 29) | E2E Location `frontend/tests/` → `e2e/[module]/` |
| ADR-012 | E2E Testing (Playwright) (lines 308–360) | Fixture file paths only: `frontend/tests/shared/fixtures/` → `e2e/shared/fixtures/`, and the four `storageState:` literals |
| ADR-012 | E2E Coverage Matrix (lines 361–400) | "Full `frontend/tests/` structure" tree → rooted at `e2e/`; the five journey-to-spec-file rows are unchanged |

### Follow-Up Edits To Eliminate The Double Canon

Applied together with this ADR (small and unambiguous): the supersession notes on ADR-009, ADR-011, and ADR-012 above, plus the `docs/adr/README.md` index row.

Drafted here but **deferred to separate PRs**, because each is either descriptive prose in an ADR whose own decision is untouched, or a change to a file that has no formal E2E suite to describe yet:

| # | File | Edit | Trigger |
|---|---|---|---|
| F1 | `docs/adr/014-prototype-playwright-testing.md` | Replace the nine descriptive `frontend/tests/` references (lines 21, 24, 63, 72, 165, 166, 173, 174, 183) with `e2e/`. ADR-014's own decision — prototype tests under `design/prototype/tests/` — is **not** superseded; only the name of the sibling layer it cross-references. | On acceptance of this ADR |
| F2 | `AGENTS.md:171` | `senior-qa` ownership row currently lists `backend/tests/`, `frontend/tests/`, and `e2e/` — drop `frontend/tests/`, since `frontend/` now owns only co-located Vitest tests. | On acceptance |
| F3 | `.github/workflows/ci.yml` | Replace `# TODO: Playwright E2E tests will be added once frontend development begins` with an `e2e-playwright` job guarded on `[ -f "e2e/package.json" ]`, following the existing per-layer guard pattern in the `validate` job. | When `e2e/` is created |
| F4 | `CLAUDE.md` → Verification Commands | Add the E2E block (`pnpm exec playwright test`, run from `e2e/`). CLAUDE.md requires every CI job to have a matching local command in the same PR, so F3 and F4 ship together. | With F3 |
| F5 | `specs/_governance/testing-constitution.md` | **No path change needed** — §VI already reads `e2e/[module]/`. Optional clarity edit: add this ADR to the source-of-truth list on line 3 so the resolved conflict is traceable. | Optional |
| F6 | `specs/_governance/frontend-constitution.md:93` | **No change needed** — already reads `e2e/[module]/`. | — |
| F7 | `.claude/rules/testing-e2e.md` | **No change needed** — already mandates root `e2e/` with `storageState` fixtures. | — |

After F1–F4 land, `grep -rn "frontend/tests" docs/ specs/ .claude/ AGENTS.md` must return zero hits. That command is the acceptance test for "double canon eliminated".

### Downstream

**Issue #209** (data-fairness negative-control fixture) is blocked on this decision and unblocked by it. Its requirement — a dataset with an unmapped field deliberately carrying real gold content, asserted absent from both the DOM **and the network layer** in annotator and reviewer views — is exactly the case the acceptance plan §8.6 rules out at the prototype layer (「原型層只能驗 DOM 渲染層防洩漏……後端 API 層與存取控制層屬正式 E2E」). Under this ADR its fixture lands in `e2e/shared/fixtures/` and its spec in `e2e/annotation/`, where network-layer assertions against a real FastAPI response are possible. It remains blocked until this ADR is Accepted and rule 7 above is lifted.

Also downstream, at the same layer and unblocked by the same acceptance: the plan's six `FAIL-D01～D06` failure scenarios (§6), and ADR-032's lifecycle-reconstruction assertion for traceability node #15 (ADR-032:116, :123).

## Consequences

### Easier

- One canon. `.claude/rules/testing-e2e.md` actually loads for the files it governs, so its locator, fixture, and port mandates take effect instead of silently not applying.
- The E2E CI job owns its own dependency graph and cache key, and can be scheduled apart from the fast frontend checks — the selective-execution concern ADR-009:127 raised.
- Directory identity matches test subject: a suite that boots FastAPI, PostgreSQL, Redis, Celery, and the React app is not a frontend artifact.
- `e2e/[module]/` lines up with `specs/[module]/` and `design/prototype/tests/[module]/`, so a spec, its prototype test, and its formal test share one module path.
- Zero constitution amendments — the two constitutions already agreed with this outcome.

### Harder

- A fourth Node package (`e2e/package.json` + lockfile) to install, update, and audit.
- Shared TypeScript types cross a package boundary. Mitigation: a `tsconfig` project reference to `frontend/`, with the E2E package otherwise kept dependency-light (`@playwright/test` plus a typed API client for seeding).
- Three ADRs now require a supersession note, and readers arriving at ADR-011 or ADR-012 from a search result must notice it. Mitigation: the note sits both in the header and inline at each affected section.
- Full-stack bring-up (compose orchestration, seeding, teardown) is new infrastructure with no precedent in this repo — `design/prototype/` only ever needed a static file server (`serve.mjs`, ADR-014).

## Relationship to Other ADRs

- [ADR-001](001-monorepo-structure.md): `e2e/` becomes a fourth top-level directory alongside `frontend/`, `backend/`, and `specs/`. Consistent with the modular-monorepo decision; no tooling layer (Nx/Turborepo) is introduced.
- [ADR-009](009-testing-strategy.md): pytest/Playwright split, TDD mandate, and coverage thresholds unchanged; only the E2E path is superseded.
- [ADR-011](011-frontend-source-structure.md): vertical feature slicing under `frontend/src/` unchanged; only the Playwright Test Structure section is superseded.
- [ADR-012](012-frontend-testing-strategy.md): the two-layer strategy, fixture pattern, coverage matrix, and Vitest co-location are all retained — the E2E layer simply relocates.
- [ADR-014](014-prototype-playwright-testing.md): prototype tests stay in `design/prototype/tests/` (issue #180 D1). This ADR extends ADR-014's precedent that a Playwright package with a distinct subject lives outside `frontend/`.
- [ADR-032](032-user-action-audit-trail.md): its lifecycle-reconstruction assertion is a formal-layer E2E test and lands in `e2e/`.
