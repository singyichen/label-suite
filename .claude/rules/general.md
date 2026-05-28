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
