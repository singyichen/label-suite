# Agent Team — New Feature Full Workflow

Use for features spanning frontend + backend. For bug fixes or single-layer changes, use a single session instead.

## Enable Agent Teams

Add to `~/.claude/settings.json`:
```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

---

## Full Workflow

```
── Phase 1: Spec ─────────────────────────────────────────────────────────────
/speckit.specify
  → specs/[module]/NNN-feature/spec.md
  → [/label-suite-design]         Generate Label Suite HTML prototype + design system
  → [/pencil-wireframe]          Draw 6 frames in design/wireframes/pages/[module]/[page].pen  (optional, after prototype)
  → [senior-uiux review]         Review prototype: fidelity, a11y, ZH/EN/mobile symmetry
  → /speckit.clarify (optional)  Prototype + optional wireframe make ambiguities concrete

  [Optional: Research Agents] — spawn before /speckit.plan for complex features

  ├──→ [ArchitectAgent]         overall structure, cross-cutting integration points, naming conventions
  ├──→ [SAAgent]                business flow analysis → Mermaid flowchart   ← from spec.md scenarios, not codebase
  ├──→ [SDAgent]                UML class / sequence diagrams (Mermaid)      ← new feature design, not existing code
  ├──→ [DBResearchAgent]        existing DB schema, migration strategy
  ├──→ [APIDesignAgent]         existing API contracts, REST naming consistency  ← no overlap with Architect
  ├──→ [BackendResearchAgent]   service boundaries in backend/app/services/      ← no overlap with APIDesign
  ├──→ [FrontendResearchAgent]  reusable components, UI integration points
  ├──→ [UXAgent]                annotation interface UX feasibility
  ├──→ [I18nAgent]              UI strings needing zh-TW/en externalization
  └──→ [NLPAdvisorAgent]        annotation schema / IAA review for annotation or NLP task features
       ↓ Team Lead synthesizes findings
  ⚠️  Human Review — confirm research findings before writing plan

/speckit.plan → /speckit.checklist → /speckit.tasks → /speckit.analyze
  → Fix every analyze finding and rerun /speckit.analyze until clear before Phase 2

── Phase 2: Agent Team Implementation ────────────────────────────────────────
[Team Lead] reads tasks.md and spawns teammates:

  ⚠️  Human Review checkpoint — required before any DB schema or API contract change

  Step A — Test Definition (TDD Red phase, before implementation):
  └──→ [senior-qa]      owns: backend/tests/ + frontend/tests/ + e2e/  (write failing tests first)
       ↓ Confirm newly added tests fail (red); existing passing tests must remain green

  Step B — parallel (after failing tests confirmed):
  ├──→ [senior-backend]   owns: backend/app/              (FastAPI routes / models / services)
  ├──→ [senior-frontend]  owns: frontend/src/             (React components / pages / services)
  ├──→ [senior-i18n]      owns: frontend/src/locales/     (zh-TW / en translation strings)
  └──→ [senior-devops]    owns: docker-compose.yml, .github/workflows/  (optional)

  Step C — after senior-backend models are confirmed:
  └──→ [senior-dba]     owns: backend/migrations/       (Alembic migrations, index strategy)

  Step D — Test Validation (TDD Green phase, after all implementation complete):
  └──→ [senior-qa]      re-runs full test suite; all tests must pass before review

  TaskCompleted hook — auto quality gate after each task:
    backend task  → cd backend && uv run ruff check . && uv run mypy .
    frontend task → if frontend/package.json exists: cd frontend && pnpm tsc --noEmit && pnpm lint
    devops task   → if compose file exists: docker compose config --quiet
                    always run: git diff --check -- .github/workflows/ docker-compose.yml docker-compose.yaml compose.yml compose.yaml
    if fails      → teammate retries (max 2), then escalates to Team Lead
    if retry > 2  → [senior-error-resolver] takes over for root-cause debugging

  TeammateIdle hook — when Step D passes, Team Lead spawns review team:
  ├──→ [senior-code-reviewer]  code quality, type safety, logic correctness
  ├──→ [senior-security]       RBAC, JWT handling, input validation, data leakage
  └──→ [senior-performance]    API p95 latency, DB query efficiency, annotation write throughput

  ⚠️  Human Review interrupt — approve before proceeding to PR
      Review team posts consolidated findings; you confirm or redirect

── Phase 3: PR Flow ──────────────────────────────────────────────────────────
Run /pr-flow

── Post-PR (optional) ────────────────────────────────────────────────────────
  [TechWriterAgent]   update README / API docs after merge
  [NLPAdvisorAgent]   on-demand for NLP task config or annotation schema decisions
```

---

## Agent Roles

### Phase 1 — Research Agents (read-only, optional)

| Teammate | Agent Type | Responsible For |
|---|---|---|
| ArchitectAgent | `senior-architect` | Overall structure, cross-cutting integration points, naming conventions |
| SAAgent | `senior-sa` | Business flow analysis from `spec.md` user scenarios → Mermaid flowchart, embedded in `plan.md` |
| SDAgent | `senior-sd` | UML class / sequence diagrams (Mermaid) for the planned feature, embedded in `plan.md` |
| DBResearchAgent | `senior-dba` | Review DB schema, identify migration strategy |
| APIDesignAgent | `senior-api-designer` | Existing API contracts, REST naming, OpenAPI conflicts |
| BackendResearchAgent | `senior-backend` | Service boundaries in `backend/app/services/` |
| FrontendResearchAgent | `senior-frontend` | Identify reusable components, UI integration points |
| UXAgent | `senior-uiux` | Assess annotation interface UX feasibility |
| I18nAgent | `senior-i18n` | UI strings needing zh-TW / en externalization |
| NLPAdvisorAgent _(annotation features)_ | `nlp-research-advisor` | Annotation schema, IAA metrics, Demo Paper framing |

### Phase 2 — Implementation Agents

| Teammate | Agent Type | Owns | Responsible For |
|---|---|---|---|
| BackendAgent | `senior-backend` | `backend/app/` | FastAPI routes, models, schemas, services |
| FrontendAgent | `senior-frontend` | `frontend/src/` | React components, pages, hooks, API services |
| I18nAgent | `senior-i18n` | `frontend/src/locales/` | zh-TW / en translation strings |
| DBAgent | `senior-dba` | `backend/migrations/` | Schema migrations, index strategy |
| TestAgent | `senior-qa` | `backend/tests/`, `frontend/tests/`, `e2e/` | pytest + Playwright E2E |
| DevOpsAgent _(optional)_ | `senior-devops` | `docker-compose.yml`, `.github/` | Docker, CI/CD |

### Phase 2 — Review Agents (parallel, after implementation)

| Teammate | Agent Type | Responsible For |
|---|---|---|
| ReviewAgent | `senior-code-reviewer` | Code quality, type safety, logic correctness |
| SecurityAgent | `senior-security` | RBAC, JWT handling, input validation, data leakage |
| PerformanceAgent | `senior-performance` | API p95 latency, DB query efficiency, write throughput |

### On-Demand Agents

| Teammate | Agent Type | When to Spawn |
|---|---|---|
| `senior-error-resolver` | `senior-error-resolver` | TaskCompleted retry > 2 times (3 attempts exhausted) |
| TechWriterAgent | `senior-technical-writer` | After PR merge, update README / API docs |
| NLPAdvisorAgent | `nlp-research-advisor` | NLP task config or annotation schema decisions |

**File ownership is critical** — each teammate owns distinct directories to prevent git conflicts.

---

## Spawn Prompt Templates

### Research Team

```
Before writing the plan for [feature], spawn a read-only research team:
- ArchitectAgent (senior-architect): scan overall codebase structure, cross-cutting integration points,
  naming conventions, and architectural conflicts (do NOT duplicate backend-specific API review)
- SAAgent (senior-sa): analyze business processes from spec.md user scenarios and produce a Mermaid
  flowchart of the end-to-end business flow (scope: spec scenarios, not codebase structure)
- SDAgent (senior-sd): design Mermaid class and sequence diagrams for the planned feature's components
  and interactions (scope: new feature design, not existing API contracts — that is APIDesignAgent's scope)
- DBResearchAgent (senior-dba): review existing DB schema and propose migration strategy
- APIDesignAgent (senior-api-designer): review existing API contracts, REST naming consistency,
  and OpenAPI spec for conflicts with the planned feature
- BackendResearchAgent (senior-backend): identify service boundaries and business logic integration
  points within backend/app/ (focus on services/, not API contracts — that is APIDesignAgent's scope)
- FrontendResearchAgent (senior-frontend): identify reusable components in frontend/src/
- UXAgent (senior-uiux): assess annotation interface UX feasibility
- I18nAgent (senior-i18n): identify UI strings needing zh-TW/en translation
- NLPAdvisorAgent (nlp-research-advisor): for annotation or NLP task features, review annotation
  schema, IAA metrics, and Demo Paper framing
All agents are read-only — no file edits. SAAgent and SDAgent return diagrams as Mermaid text in their
findings; Team Lead embeds them into plan.md during synthesis. Synthesize all findings for plan.md.
```

### Implementation Team

```
Create an agent team to implement [feature] based on specs/[module]/NNN-feature/tasks.md.
Spawn in this order (TDD):
Before Step A — verify current branch is not main, run /speckit.checklist if not already complete,
confirm specs/[module]/NNN-feature/tasks.md exists, and run /speckit.analyze until clear.
Step A — senior-qa: write failing tests first (own backend/tests/, frontend/tests/, e2e/)
          ↓ confirm newly added tests fail (red); existing passing tests must remain green
Step B — parallel implementation (after failing tests confirmed):
  - senior-backend: backend tasks, owns backend/app/
  - senior-frontend: frontend tasks, owns frontend/src/
  - senior-i18n: translation strings, owns frontend/src/locales/
  - senior-devops (optional): Docker/CI tasks, owns docker-compose.yml, .github/workflows/
Step C — senior-dba: migrations after senior-backend models confirmed, owns backend/migrations/
Step D — senior-qa: re-run full test suite; all tests must be green before review
Require plan approval before any DB schema or API contract changes.
After each task quality gate passes, teammates report completed task IDs to Team Lead.
Team Lead serially marks completed task IDs in tasks.md as [X] to avoid parallel write conflicts.
```
