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
  → [/pencil-wireframe]          Draw 6 frames in design/wireframes/pages/[module]/[page].pen  (optional)
  → [/ui-ux-pro-max] (optional)  HTML prototype + design system; use wireframe as layout reference
  → [senior-uiux review]         Review prototype: fidelity, a11y, ZH/EN/mobile symmetry
  → /speckit.clarify (optional)  Wireframe + prototype make ambiguities concrete

  [Optional: Research Agents] — spawn before /speckit.plan for complex features

  ├──→ [ArchitectAgent]         overall structure, cross-cutting integration points, naming conventions
  ├──→ [DBResearchAgent]        existing DB schema, migration strategy
  ├──→ [APIDesignAgent]         existing API contracts, REST naming consistency  ← no overlap with Architect
  ├──→ [BackendResearchAgent]   service boundaries in backend/app/services/      ← no overlap with APIDesign
  ├──→ [FrontendResearchAgent]  reusable components, UI integration points
  ├──→ [UXAgent]                annotation interface UX feasibility
  └──→ [I18nAgent]              UI strings needing zh-TW/en externalization
       ↓ Team Lead synthesizes findings
  ⚠️  Human Review — confirm research findings before writing plan

/speckit.plan → /speckit.tasks

── Phase 2: Agent Team Implementation ────────────────────────────────────────
[Team Lead] reads tasks.md and spawns teammates:

  Step A — parallel (no inter-dependency):
  ├──→ [BackendAgent]   owns: backend/app/              (FastAPI routes / models / services)
  ├──→ [FrontendAgent]  owns: frontend/src/             (React components / pages / services)
  ├──→ [I18nAgent]      owns: frontend/src/locales/     (zh-TW / en translation strings)
  └──→ [DevOpsAgent]    owns: docker-compose.yml, .github/workflows/  (optional)

  ⚠️  Human Review checkpoint — required before any DB schema or API contract change
      Tell Team Lead: "Require plan approval before BackendAgent makes schema changes"

  Step B — after BackendAgent models are confirmed:
  └──→ [DBAgent]        owns: backend/migrations/       (Alembic migrations, index strategy)

  Step C — after BackendAgent + FrontendAgent complete:
  └──→ [TestAgent]      owns: backend/tests/ + frontend/tests/  (pytest + Playwright E2E)

  TaskCompleted hook — auto quality gate after each task:
    backend task  → uv run ruff check . && uv run mypy .
    frontend task → pnpm tsc --noEmit && pnpm lint
    if fails      → teammate retries (max 2), then escalates to Team Lead
    if retry > 2  → [ErrorResolverAgent] takes over for root-cause debugging

  TeammateIdle hook — when all implementation teammates idle, Team Lead spawns review team:
  ├──→ [ReviewAgent]      code quality, type safety, logic correctness
  ├──→ [SecurityAgent]    RBAC, JWT handling, input validation, data leakage
  └──→ [PerformanceAgent] API p95 latency, DB query efficiency, annotation write throughput

  ⚠️  Human Review interrupt — approve before proceeding to PR
      Review team posts consolidated findings; you confirm or redirect

  /speckit.checklist

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
| DBResearchAgent | `senior-dba` | Review DB schema, identify migration strategy |
| APIDesignAgent | `senior-api-designer` | Existing API contracts, REST naming, OpenAPI conflicts |
| BackendResearchAgent | `senior-backend` | Service boundaries in `backend/app/services/` |
| FrontendResearchAgent | `senior-frontend` | Identify reusable components, UI integration points |
| UXAgent | `senior-uiux` | Assess annotation interface UX feasibility |
| I18nAgent | `senior-i18n` | UI strings needing zh-TW / en externalization |

### Phase 2 — Implementation Agents

| Teammate | Agent Type | Owns | Responsible For |
|---|---|---|---|
| BackendAgent | `senior-backend` | `backend/app/` | FastAPI routes, models, schemas, services |
| FrontendAgent | `senior-frontend` | `frontend/src/` | React components, pages, hooks, API services |
| I18nAgent | `senior-i18n` | `frontend/src/locales/` | zh-TW / en translation strings |
| DBAgent | `senior-dba` | `backend/migrations/` | Schema migrations, index strategy |
| TestAgent | `senior-qa` | `backend/tests/`, `frontend/tests/` | pytest + Playwright E2E |
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
| ErrorResolverAgent | `senior-error-resolver` | TaskCompleted retry > 2 times |
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
- DBResearchAgent (senior-dba): review existing DB schema and propose migration strategy
- APIDesignAgent (senior-api-designer): review existing API contracts, REST naming consistency,
  and OpenAPI spec for conflicts with the planned feature
- BackendResearchAgent (senior-backend): identify service boundaries and business logic integration
  points within backend/app/ (focus on services/, not API contracts — that is APIDesignAgent's scope)
- FrontendResearchAgent (senior-frontend): identify reusable components in frontend/src/
- UXAgent (senior-uiux): assess annotation interface UX feasibility
- I18nAgent (senior-i18n): identify UI strings needing zh-TW/en translation
All agents are read-only — no file edits. Synthesize findings for plan.md.
```

### Implementation Team

```
Create an agent team to implement [feature] based on specs/[module]/NNN-feature/tasks.md.
Spawn:
- BackendAgent (senior-backend): backend tasks, owns backend/app/
- FrontendAgent (senior-frontend): frontend tasks, owns frontend/src/ [parallel with backend]
- I18nAgent (senior-i18n): translation strings, owns frontend/src/locales/ [parallel]
- DBAgent (senior-dba): migrations, owns backend/migrations/
- TestAgent (senior-qa): tests after API contract is confirmed
Require plan approval before any DB schema or API contract changes.
```
