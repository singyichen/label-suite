# ADR-027: Project Management Tool — GitHub Projects

**Status**: Accepted
**Date**: 2026-06-09
**Version**: 1.1

## Changelog

- **1.1** (2026-06-09) — Aligned ADR with the actual project setup after implementation:
  - Iteration duration: 1 week → 2 weeks (solo thesis dev cadence)
  - Roadmap `Dates` source: Start/Target date → Iteration (avoids manual per-item date entry)
  - Views: reused 4 Feature release template defaults instead of creating 5 from scratch; only 2 new views created (By Module, Done This Week)
  - Filter syntax for Issue Type field: `issue-type:Bug,Incident` (GitHub auto-slugs the custom field name)
  - Documented that view creation has **no GraphQL mutation support** — all views are UI-only
  - Built-in workflows automatically enable a 5th default (`Auto-archive items` with `is:issue is:closed updated:<@today-2w`); accepted as-is
- **1.0** (2026-06-09) — Initial decision and SOP

## Context

The project has accumulated multiple sources of work tracking:

- **GitHub Issues** with nine pre-defined labels (`bug`, `feature`, `enhancement`, `task`, `ui`, `spike`, `docs`, `question`, `incident`) opened by both humans and AI agents (`.claude/rules/issue-reporting.md`).
- **`specs/STATUS.md`** tracking spec lifecycle across the eight-stage SDD pipeline (brainstorm → specify → plan → tasks → implement → analyze → checklist → pr-flow).
- **`docs/product/milestones.md`** holding thesis-level milestones (Demo Paper submission, oral defense).
- **`claude-progress.md`** per-session checkpoint files for cross-session tasks.

The result: no single place to see "what is in progress right now, across all modules, with thesis-timeline context." Issues lack pipeline-stage visibility. `STATUS.md` is spec-only and cannot represent ad-hoc bug fixes or research spikes. Milestones are static markdown.

The project needs a lightweight, git-native, zero-cost project management surface that:

- Aggregates Issues and PRs without duplicating their data
- Visualises SDD pipeline progress at a glance
- Supports thesis milestones on a timeline
- Auto-ingests agent-opened issues without manual triage
- Imposes zero additional infrastructure (no SaaS account, no extra server)

### Alternatives Considered

| Tool | Cost | Git-Native | Auto-Sync with Issues/PRs | Notes |
|------|------|------------|---------------------------|-------|
| **GitHub Projects (v2)** | Free | ✅ (same repo) | ✅ built-in workflows | Selected |
| Linear | Paid (free tier limited) | ❌ webhook only | ⚠️ via integration | Best UX, but cost + sync lag |
| Jira | Paid | ❌ | ⚠️ via GitHub app | Overkill for solo thesis dev |
| Trello | Free | ❌ | ❌ manual | No PR linkage |
| Notion Database | Free tier | ❌ | ❌ manual | No native issue sync |
| Plain `STATUS.md` (current) | Free | ✅ | ❌ manual | Spec-only, no timeline |

## Decision

Adopt **GitHub Projects (v2)** at the repository level, instantiated from the **Feature release** template and customised to match the SDD pipeline.

### Scope Boundary

To avoid duplicated truth-sources:

| Concern | Source of Truth |
|---------|-----------------|
| Spec lifecycle stage (per spec folder) | `specs/STATUS.md` |
| Issue / PR progress within SDD pipeline | GitHub Projects |
| Thesis milestones (submission, defense) | `docs/product/milestones.md` mirrored into Project Roadmap view |
| Cross-session checkpoint state | `claude-progress.md` (gitignored, ephemeral) |

`STATUS.md` remains the canonical spec-stage record updated by SDD pipeline commands. The Project mirrors issue/PR-level progress only.

### Custom Fields

Override the default Feature release fields with the following:

| Field | Type | Options |
|-------|------|---------|
| `Status` | Single-select | `Backlog` · `Brainstorming` · `Specifying` · `Planning` · `Tasking` · `Implementing` · `Analyzing` · `In Review` · `Done` · `Blocked` |
| `Module` | Single-select | `account` · `dashboard` · `task-management` · `annotation` · `dataset` · `admin` · `infra` · `docs` |
| `Issue Type` | Single-select | `Bug` · `Feature Add` · `Feature Change` · `Task` · `UI` · `Spike` · `Docs` · `Question` · `Incident` |
| `Priority` | Single-select | `P0` · `P1` · `P2` · `P3` |
| `Size` | Single-select | `XS` · `S` · `M` · `L` · `XL` |
| `Iteration` | Iteration | Thesis sprint cadence (2-week iterations) |
| `Start date` | Date | — |
| `Target date` | Date | — |

### Views

The Feature release template ships with six default views. Four are reused, one is dropped, and two new ones are added — total seven views.

| View | Source | Layout | Filter | Group By | Notes |
|------|--------|--------|--------|----------|-------|
| `Prioritized backlog` | template default (kept) | Table | template default | `Priority` | Quick triage by importance |
| `Status board` | template default (kept) | Board | none | `Status` | Daily WIP visualisation |
| `Roadmap` | template default (modified) | Roadmap | none | `Module` | `Dates` source: **Iteration** field (auto-derived from sprint) |
| `Bugs 🐛` | template default (modified) | Table | `issue-type:Bug,Incident` | `Priority` | Filter uses the custom `Issue Type` field, slugged as `issue-type` |
| `In review` | template default (kept) | Table | `status:"In Review"` | `Status` | PR review queue |
| `My items` | template default (kept) | Table | `assignee:@me` | none | Personal cut |
| `By Module` | **new** | Table | none | `Module` | Cross-module audit |
| `Done This Week` | **new** | Table | `status:Done closed:>@today-7d` | none | Weekly retrospective input |

### Auto-Add Workflow

All issues and PRs in the repository are added to the Project with `Status = Backlog`. Built-in workflows handle the rest:

| Trigger | Action |
|---------|--------|
| Issue opened | Add to Project, set `Status = Backlog` |
| Issue label `bug` or `incident` added | Set `Issue Type = Bug` / `Incident` |
| PR opened | Add to Project, set `Status = In Review` |
| PR merged | Set `Status = Done` |
| Issue closed | Set `Status = Done` |
| Item idle > 14 days in non-`Done` status | Add comment "Stale — please update or close" |

Label → `Issue Type` mapping is one-to-one with `.claude/rules/issue-reporting.md`:

```text
bug              → Bug
feature          → Feature Add
enhancement      → Feature Change
task             → Task
ui               → UI
spike            → Spike
docs             → Docs
question         → Question
incident         → Incident
```

`Status` transitions through SDD stages (Brainstorming → … → In Review) are **manual**, performed by the developer or team-lead agent. Auto-workflows only handle the unambiguous endpoints (Backlog on open, Done on close).

## Setup SOP

Execute once per repository. Estimated time: 20 minutes (15 min API + 5 min UI).

### Step 1 — Create the Project (UI only)

1. Open `https://github.com/<owner>` → top-level **Projects** tab → **New project**.
2. Choose template **Feature release**.
3. Name: `Label Suite Roadmap`.
4. Visibility: same as repository.

After creation, note the Project number from the URL (e.g. `/projects/2`).

### Step 2 — Configure Fields (API)

Custom-field configuration can be fully scripted via GraphQL. Use `gh auth refresh -s project` to grant write access first, then run a shell script that performs the following mutations against the Project ID:

1. `updateProjectV2Field` on the default `Status` field — replace the 5 template options with the 10 SDD-aligned options listed under **Custom Fields**.
2. `updateProjectV2Field` on the default `Priority` field — add `P3` to extend from 3 to 4 options.
3. `deleteProjectV2Field` on the default `Estimate` field — Size covers the same purpose.
4. `createProjectV2Field` × 2 — create `Module` (8 options) and `Issue Type` (9 options).
5. `linkProjectV2ToRepository` — link the target repository so issues become eligible for auto-add.

A reference implementation lives at `/tmp/setup-project.sh` during the actual setup (not committed); regenerate it if needed by reading the field/option lists in this ADR.

> **Idempotency caveat:** re-running step 4 will fail with "field name already exists." Run steps 1–5 once per Project; for partial re-runs, comment out completed mutations.

### Step 3 — Iteration Field (UI only — API does not expose start date)

Open **Settings → Fields → Iteration**:

- Duration: **2 weeks**
- Start date: current Monday

GitHub auto-creates the next 3 iterations from this anchor.

### Step 4 — Built-in Workflows (UI only — API has no mutation)

Open **Workflows** (top-right of the Project, not Settings sidebar). The Feature release template ships with 2 default workflows enabled (`Auto-add sub-issues to project`, `Auto-add to project`); enable 3 more and accept the `Auto-archive items` default:

| Workflow | Action |
|----------|--------|
| `Item added to project` | Set `Status = Backlog` |
| `Item closed` | Set `Status = Done` |
| `Pull request merged` | Set `Status = Done` |
| `Auto-archive items` | Accept default filter `is:issue is:closed updated:<@today-2w` |

For `Auto-add to project`, verify the filter is `is:issue,pr` and the repository is the target repo (template usually pre-fills this correctly).

After this step, the **Workflows** badge in the Project header should show `6` (2 sub-issue + 4 enabled by us).

### Step 5 — Configure Views (UI only — API has no view mutation)

GitHub does **not** expose `createProjectV2View` or `updateProjectV2View` in the public GraphQL schema. All view edits must be done in the UI.

Adjust the 6 template-default views and add 2 new ones per the **Views** table above. Per-view setup: click the view's ⌄ dropdown → set `Group by` / `Filter` / (for Roadmap) `Dates` / `Markers` → menu → **Save changes to this view**.

### Step 6 — Add Label-Driven Automation

Built-in workflows cannot set `Issue Type` from labels. Add this workflow at `.github/workflows/project-sync.yml`:

```yaml
name: Sync Issue Labels to Project Fields
on:
  issues:
    types: [opened, labeled]
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/add-to-project@v1
        with:
          project-url: https://github.com/users/<owner>/projects/<N>
          github-token: ${{ secrets.PROJECT_TOKEN }}
          labeled: bug,feature,enhancement,task,ui,spike,docs,question,incident
          label-operator: OR
```

`PROJECT_TOKEN` is a fine-grained PAT with `Projects: Read and write` + `Issues: Read` scopes, stored as a repository secret.

Setting `Issue Type` from each specific label requires GraphQL mutations beyond the scope of `actions/add-to-project`; defer that automation until manual triage becomes a bottleneck.

### Step 7 — Seed Initial Milestones

Mirror thesis milestones from `docs/product/milestones.md` into the Project as items with `Issue Type = Task`, `Module = docs`, and the corresponding `Target date`. Update only when the source file changes — `milestones.md` stays canonical.

### Step 8 — Document the Project URL

Add the Project URL to `docs/product/README.md` under a new `## Project Board` section so contributors and agents can discover it.

## Consequences

### Positive

- Single visualisation of pipeline state across modules with zero new infrastructure.
- Agent-opened issues land in the Backlog automatically; no manual triage step.
- Thesis timeline lives on the same surface as day-to-day work — milestone slippage is visible immediately.
- Closing the loop on PRs auto-completes the corresponding Project item.

### Negative

- Two systems still track stage information (`STATUS.md` for spec stages, Project for issue/PR stages). Discipline required to keep the boundary clean.
- GitHub Projects has no offline mode and no rich text export — milestones reports must be screenshot or generated via GraphQL.
- The label → `Issue Type` workflow needs a custom GraphQL mutation if granular auto-mapping is later required; current SOP only adds items without setting `Issue Type`.

### Follow-ups

- After 2 weeks of use, evaluate whether `Iteration` (sprint cadence) is being maintained — if not, drop it and rely on `Target date` alone.
- If manual `Issue Type` triage exceeds 10 issues / week, write the GraphQL-based label-to-field automation.
- Consider promoting `claude-progress.md` cross-session notes into Project item comments for permanence.
- Monitor whether GitHub adds view-mutation support to GraphQL; if so, formalise the View configuration as a script and remove the UI-only caveat in Step 5.
