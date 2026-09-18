# General Coding Rules

### Think Before Coding

Before implementing anything:

- State your assumptions explicitly. If uncertain, ask — don't silently pick an interpretation.
- If multiple valid approaches exist, present them with tradeoffs. Don't choose without surfacing the choice.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask before proceeding.

### Simplicity First

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

The test: Would a senior engineer say this is overcomplicated? If yes, simplify.

#### Reach-for ladder

Walk down this list and stop at the first rung that works:

1. **Does this need to exist at all?** — speculative need → say so in one line, skip it (YAGNI)
2. **Already in this codebase?** — an existing helper, util, type, or pattern → reuse it
3. **Stdlib does it?** — use it
4. **Native platform feature covers it?** — `<input type="date">` over a picker lib, CSS over JS, a DB constraint over app code
5. **An already-installed dependency solves it?** — use it; never add a new one for what a few lines can do
6. **Can it be one line?** — one line
7. **Only then** — the minimum code that works

**Rung 1 is a scope question and belongs to Planner / `/opsx:propose`**, where scope is still open; record its answer in `proposal.md`'s `## Why`. It must NOT fire during `/opsx:apply` — scope is locked once Generator starts, and dropping an FR mid-sprint leaves `tasks.md` ticked with the AC unimplemented, which no verification gate detects. Rungs 2–7 are implementation choices inside locked scope and apply throughout Generator work.

#### Known-ceiling markers

A deliberate simplification that cuts a real corner gets a `ponytail:` comment naming the ceiling and the upgrade path:

```python
# ponytail: global lock; per-account locks if throughput matters
```

This marker is for **implementation ceilings only** — lock granularity, an O(n^2) scan over a list known to be small, a naive heuristic. A deferred *requirement* is never a code comment: it goes to the spec or a GitHub issue per `issue-reporting.md`. `specs/` is the SSoT, and a requirement parked in a comment is a second backlog that nothing reads.

(Marker name from the ponytail skill, MIT (c) 2026 DietrichGebert, kept verbatim so its tooling stays an option.)

#### What simplicity does not override

- **Red test contracts.** `senior-qa` owns the Red contract; TDD is REQUIRED and coverage is gated at `--cov-fail-under=80`. "The code is trivial" is not grounds to skip a spec'd test.
- **Prose outside code.** "If the explanation is longer than the code, delete the explanation" applies to code comments only. Every commit still needs WHY body bullets, and PR/issue/`specs/`/`openspec/` bodies are review documents.
- **Layer-level PR splits.** "Fewest files possible" yields to backend-constitution XIII / frontend-constitution XVI.

### Surgical Changes

Touch only what you must. Clean up only your own mess.

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### DRY (Do Not Repeat Yourself)

One logic, one place.

- Shared logic/validation/constants must have a single source of truth.
- If the same code appears in 2+ places, extract and reuse.
- Keep abstractions minimal; prefer small shared helpers.

### Design Principles

- Follow SOLID, DRY, KISS, YAGNI — when DRY leads to over-abstraction, KISS takes priority
- Each function does one thing; each module has one responsibility

### Security

- All user inputs must be validated and sanitized to prevent SQL Injection and XSS attacks
- Never hardcode API keys or tokens in code; use environment variables
- CORS must not use `allow_origins=["*"]`; explicitly list allowed origins

### Conflicting Patterns

When the codebase has contradictory conventions: pick one (prefer newer or better-tested), state the reason, flag the other for future cleanup. Never pick silently.

### Fail Loudly

If any step cannot be fully verified — file existence, API behavior, test intent — report the uncertainty explicitly. Silent failures are not allowed.

### AI Agent Non-Negotiables

- Use `uv add` (not pip) for backend packages; `pnpm add` for frontend
- All backend commands must be run via `uv run`
- Before adding code: read existing exports, caller functions, and shared utilities in the affected area first
- Remove debug `print` / `console.log` before finishing
- Do not modify version numbers in `pyproject.toml` or `package.json` unless explicitly asked
