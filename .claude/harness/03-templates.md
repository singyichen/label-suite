# E. Standard Delegation Prompt Templates

> Copy the template, fill every `{...}` slot, delete unused optional lines. A dispatch with an empty slot is invalid — see [01-dispatch.md](01-dispatch.md) §3.
> Universal report contract (append to every dispatch): **"Return: status PASS/FAIL/BLOCKED · file paths + line numbers · last 10 lines of any command output · ≤ 5-line summary. No code blocks > 5 lines. If BLOCKED, name the exact missing fact."**

## T1 — Research / Search (agent: `Explore`, model: haiku or sonnet)

```
[Goal] Answer: {one precise question — not "understand X" but "which function
decides X, and what are its inputs?"}
[Context] Start from: {≥1 concrete anchor: file path, symbol name, or spec section}.
Related background: {1–2 sentences; link spec/ADR if relevant}.
[Scope] Look in {dirs}; ignore {dirs, e.g. node_modules, _archive}.
[Acceptance]
1. The answer names exact file paths and line numbers for every claim.
2. If the answer cannot be established from the code, say NOT FOUND — do not infer.
[Report] Direct answer first (≤ 3 sentences), then evidence list (path:line — what it shows).
```

## T2 — Feature Implementation (agent: `senior-backend`/`senior-frontend`/`senior-full-stack`, model: sonnet)

```
[Goal] Implement spec item {ID} from {specs/[module]/NNN-feature/tasks.md}: {one-sentence description}.
[Context] Read FIRST, in order: {spec section path} · {existing files to modify} ·
{relevant rules file, e.g. .claude/rules/api.md}. Branch: {branch-name}.
[Constraints] TDD mandatory — write the failing test, run it, show it red, then implement.
Do not touch files outside: {explicit path list}. Constitution: no hardcoded task
logic; no ground-truth leakage in annotator-facing responses.
[Acceptance]
1. New test exists at {tests path}, failed before impl (include the red run output).
2. {verification commands for the touched stack} all exit 0.
3. `git diff --stat` shows only the allowed paths.
4. {feature-specific behavioral check, e.g. "POST /api/v1/tasks returns 201 + Location header"}.
[Report] <universal contract> + name the test that proves the feature.
```

## T3 — Refactor (agent: `senior-backend`/`senior-frontend`, model: sonnet; ≥10 files → opus plans, sonnet executes)

```
[Goal] {one structural concern only: rename X / extract Y / simplify Z}. No behavior change.
[Context] Motivation: {why}. Affected surface: {paths}. Callers found at: {paths or "run T1 first"}.
[Constraints] Zero behavior change: no test assertions may change. No opportunistic
cleanup outside the named concern. If the refactor reveals a bug, REPORT it — do not fix it here.
[Acceptance]
1. Full verification suite exits 0 with NO test modifications
   (`git diff --stat -- '*test*' '*.spec.*'` is empty).
2. Old symbol/pattern gone: `grep -rn "{old symbol}" {scope}` returns 0 hits.
3. Diff ≤ {N} files; if it wants to grow beyond, stop and report.
[Report] <universal contract> + before/after shape (1 line each).
```

## T4 — Code Review (agent: `feature-dev:code-reviewer` or `senior-code-reviewer`, model: sonnet)

```
[Goal] Review {branch/PR/diff range} for: correctness bugs, constitution violations
(hardcoded task logic, answer leakage), api.md contract compliance, missing tests.
[Context] The change claims to: {implementer's stated purpose}. Spec: {path}.
[Constraints] Review the diff AND the acceptance criteria of the original task —
verify each criterion independently (run the commands; do not trust the implementer's report).
[Acceptance]
1. Every finding has: severity (blocker/major/minor) · path:line · why it's wrong · concrete fix.
2. Explicit verdict per original acceptance criterion: HOLDS / VIOLATED / NOT CHECKABLE.
3. Zero findings is a valid outcome — do not invent nitpicks to seem thorough.
[Report] Verdict table first, findings list second. No rewritten code > 5 lines — describe the fix.
```

## Fully-filled example (T1)

```
[Goal] Answer: which function computes the annotator agreement score shown on the
dashboard, and does it read ground-truth labels?
[Context] Start from: frontend/src/features/dashboard/ and the term "agreement".
Background: checking Data Fairness (Constitution III) before exposing a new API field.
[Scope] Look in frontend/src/ and backend/app/; ignore specs/_archive, node_modules.
[Acceptance]
1. The answer names exact file paths and line numbers for every claim.
2. If the answer cannot be established from the code, say NOT FOUND — do not infer.
[Report] Direct answer first (≤ 3 sentences), then evidence list (path:line — what it shows).
Return: status PASS/FAIL/BLOCKED · file paths + line numbers · ≤ 5-line summary.
```
