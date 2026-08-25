# Agent Team — New Feature Full Workflow

Use for cross-layer features or changes that need coordinated, independently owned tasks. For a bug fix or a single-layer change, use a single session instead.

## Enable Agent Teams

Add to `~/.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

## Canonical Flow

`docs/sdd-workflow.md` is the authority for SDD orchestration. Proposed ADRs do not change this command; in particular, formal frontend E2E placement remains path-neutral while ADR-034 is Proposed. Each task must name its exact test file, and the applicable Accepted ADR plus the testing constitution decide formal E2E placement.

```text
/superpowers:brainstorm
  → /speckit.specify → Spec Lint
  → /label-suite-design → static shell → Red → Green → page design
  → /speckit.clarify (optional) → Frontend Ready Gate
  → /opsx:propose → Gate 1 → Gate 2
  → user confirmation → /opsx:apply → Gate 3 per task and PR group
  → final PR group: Gate 4 → /opsx:archive → /pr-flow
  → post-merge STATUS update and canonical spec movement
```

For a page-scoped feature, `/label-suite-design` first creates a loadable static shell without target interaction. `senior-qa` then commits and runs the expected-failure Red Playwright contract. Only after Team Lead confirms that evidence may the implementation agent add the target `data-testid` selector contract and behavior, make it Green, refactor, and finish page design.

## Four Verification Checkpoints

Keep exactly these four checkpoints distinct; passing one never substitutes for another.

1. **OpenSpec schema validation** — non-strict schema, delta, and scenario structure, such as `openspec validate --changes --no-interactive`.
2. **Project SDD lint** — project headings and goal/status/ownership/retired-path rules. Until its tooling exists, retain the workflow checklist and review evidence.
3. **Code/test gates** — committed Red expected-failure evidence, Green exit-0 evidence, and the applicable backend, frontend, prototype, E2E, security, type, and lint commands.
4. **Source-Verify + final archive/write-back** — before final archive, validate every touched FR/AC ID against the canonical spec and confirm the canonical version and Changelog update. Successful write-back in the final PR group completes this checkpoint.

The Frontend Ready Gate and stacked-PR timing remain separate workflow stages defined by `docs/sdd-workflow.md`.

## Phase 1 — Research and Change Preparation

Research agents are optional, read-only, and may run in parallel for complex features:

| Teammate | Agent type | Focus |
|---|---|---|
| ArchitectAgent | `senior-architect` | Structure, integration points, and naming conventions |
| SAAgent | `senior-sa` | Business flow from canonical spec scenarios |
| SDAgent | `senior-sd` | Class and sequence diagrams for the planned change |
| DBResearchAgent | `senior-dba` | Schema review and migration strategy |
| APIDesignAgent | `senior-api-designer` | API contracts, REST naming, and OpenAPI conflicts |
| BackendResearchAgent | `senior-backend` | Service boundaries |
| FrontendResearchAgent | `senior-frontend` | Reusable UI and integration points |
| UXAgent | `senior-uiux` | Prototype fidelity, accessibility, and annotation UX |
| I18nAgent | `senior-i18n` | zh-TW/en strings to externalize |
| NLPAdvisorAgent | `nlp-research-advisor` | Annotation schema and IAA for annotation features |

Team Lead synthesizes findings, pauses for the research checkpoint, then runs `/opsx:propose`. After the user reviews the generated `design.md` and `tasks.md`, complete Gate 1 and Gate 2 separately before `/opsx:apply`.

## Phase 2 — Task Execution

Before Phase A, Team Lead verifies a non-`main` feature branch. A DB schema or API contract change requires the user checkpoint before the affected implementation proceeds.

### Phase A — Red Test Definition

`senior-qa` owns each separate Red task. It must create the requirement-linked contract, commit it, run the designated test, and record its expected failure reason. Team Lead verifies the commit and evidence, then is the only role that marks that Red task checkbox in `tasks.md`.

### Phase B — Green Implementation

Only after the paired committed Red evidence is confirmed may the appropriate implementation agent begin its Green task:

| Teammate | Agent type | Owns |
|---|---|---|
| BackendAgent | `senior-backend` | `backend/app/`, `backend/bruno/` |
| FrontendAgent | `senior-frontend` | `frontend/src/` |
| I18nAgent | `senior-i18n` | `frontend/src/locales/` |
| DevOpsAgent (optional) | `senior-devops` | `docker-compose.yml`, `.github/workflows/`, `.env.example`, `scripts/` |

The implementation agent consumes the Red contract, does not weaken or rewrite it merely to pass, and reports Green evidence. Team Lead runs the required exit-0 checks and is the only role that marks the verified Green checkbox.

### Phase C — Database Migrations

After senior-backend models are confirmed, `senior-dba` owns the declared migration tasks. Preserve the DB user checkpoint and run the migration-specific checks stated in `tasks.md`.

### Phase D — Per-PR-Group Review and Acceptance

After all paired Green tasks in one PR group are checked, but before that group's `/pr-flow`:

1. `senior-code-reviewer` performs Code Review for architecture, type safety, logic, applicable constitutions, and `design.md` contract compliance.
2. `senior-qa` performs Scenario acceptance against the change delta's WHEN/THEN scenarios and the canonical spec's FR/AC. It does not perform Code Review.

Neither reviewer writes `tasks.md` checkboxes. If review returns work, the implementation agent corrects it and Team Lead reruns the affected Green checks plus this PR-group review sequence. Stop and report to the user after two PR-group review returns.

## PR Timing and Archive

Each PR group completes Phase D before its own `/pr-flow`.

- **Intermediate PR group:** run `/pr-flow` and merge in stacked order. The OpenSpec change stays open; do not archive.
- **Final PR group:** after Phase D and Gate 1–3 evidence, collect Source-Verify evidence, run `/opsx:archive` and canonical write-back inside the final PR, and thereby complete Gate 4. Then run `/pr-flow` and merge. Only after the final merge may `specs/STATUS.md` move to archived and the canonical spec move to `specs/_archive/`.

## Team Lead Dispatch Contract

For every teammate, Team Lead supplies:

1. The complete assigned task text from `tasks.md`.
2. The API contract when the task crosses the backend/frontend boundary.
3. The exact file ownership boundary, including files the teammate must not touch.
4. The task's quality-gate command and expected result.
5. For Green tasks, the Red task ID, commit, contract, and expected-failure evidence to preserve.

Subagents do not spawn subagents and do not edit `tasks.md` checkboxes. Team Lead alone updates checkboxes serially after personally verifying the required Red or Green evidence.

## Escalation and Quality Checklist

- Any Gate 1, Gate 2, Gate 3, or Gate 4 evidence gap stops its affected stage until that specific checkpoint is repaired and rerun.
- A teammate may retry a failed task twice. On the third failure, Team Lead dispatches `senior-error-resolver` with the exact error output.
- An API contract conflict pauses affected agents for the required user decision.
- A security finding pauses the PR flow and is reported immediately.
- Never proceed beyond a DB schema or API contract checkpoint without user confirmation.
- The main session/Team Lead is the sole checkbox writer; `senior-qa`, implementation agents, and reviewers never mark tasks complete.

## Progress Reporting

Team Lead reports to the user in Traditional Chinese after research, Gate 1–2, each committed Red task, Green implementation, each PR group's Phase D review, and final archive/write-back. Each report states completed work, verification evidence, remaining work, and any required user confirmation.
