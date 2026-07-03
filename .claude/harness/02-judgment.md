# D. Judgment Externalization Matrix

> Fable 5's high-level intuitions, quantized into checklists a Sonnet-class model can apply by eye.
> Each criterion has a ✅ perfect-positive and ❌ typical-negative example. When in doubt, the ❌ column wins (treat as violation).

## §1 "Wrong direction — stop and change path" signals

Retrying in place is only correct when the failure is mechanical (typo, missing import). ANY of the signals below means the **approach** is wrong; do not produce attempt N+1 of the same approach — back out, re-read the spec, and pick a different path (or escalate per [01-dispatch.md](01-dispatch.md) §4).

| # | Signal | ✅ Correct response (positive example) | ❌ Typical failure (negative example) |
|---|--------|----------------------------------------|----------------------------------------|
| 1 | The fix needs edits in files the task never mentioned, and the list keeps growing (3+ files beyond the named scope) | "Making this test pass requires touching the auth middleware — that's outside the spec item. Stopping; reporting scope conflict." | Silently editing 6 extra files until everything compiles, producing an unreviewable diff |
| 2 | Two consecutive attempts edited the **same lines** and the error message is unchanged | "Same error after two different edits to lines 40–55 — my model of the bug is wrong. Re-reading the caller and the test setup before touching this file again." | Attempt #3 shuffles the same lines a third way ("maybe it's the order of the checks…") |
| 3 | The "fix" makes a test pass by weakening the test (loosening an assertion, deleting a case, adding `skip`) without a spec citation | "The assertion contradicts spec §FR-2 line 34, so I'm updating the expected value and citing it in the commit body." | Changing `assert count == 3` to `assert count >= 1` because 3 is "hard to reproduce" |
| 4 | Fixing flakiness/timing by adding `sleep`, retries, or broadened `try/except` | "The race is real: the fixture commits after the request fires. Fixing the fixture ordering." | `await asyncio.sleep(0.5)` before the assertion; wrapping in `try/except Exception: pass` |
| 5 | Silencing the checker instead of the cause: `# type: ignore`, `eslint-disable`, `as any`, deleting a lint rule | "mypy is right — the return type is `str \| None`; adding the None guard at the call site." | Adding `# type: ignore[return-value]` to ship it; `as unknown as Task` |
| 6 | You cannot state in one sentence WHY the last attempt failed | Write the one-sentence cause first; if you can't, run a smaller probe (minimal repro, print the actual value) BEFORE the next fix | "Let me just try one more thing" with no stated hypothesis |
| 7 | The solution re-implements something that likely exists (helper, fixture, shared component) | Search `shared/`, `tests/factories/`, existing exports first; found → reuse | Writing a second `formatScore()` because the first wasn't found in 30 seconds |
| 8 | Solving requires inventing a fact you don't have (an API contract, a requirement, a design value) | Mark BLOCKED, list the exact missing fact, ask (§3) | Guessing that the endpoint "probably returns 200 with an empty list" and coding to the guess |

## §2 Definition of Done (quantified — ALL boxes, no exceptions)

A task may be reported "done" only when every line below is checked with **evidence** (command output seen this session, not remembered):

- [ ] `cd backend && uv run pytest tests/ -q` exits 0 (if backend touched)
- [ ] `cd backend && uv run mypy app/ --strict` exits 0 (if backend touched)
- [ ] `cd backend && uv run ruff check . && uv run ruff format --check .` exits 0 (if backend touched)
- [ ] `cd frontend && pnpm tsc --noEmit && pnpm lint && pnpm test` exit 0 (if frontend touched)
- [ ] A test exists that **failed before** the implementation (TDD evidence: you saw it red this session, or the commit history shows test-first)
- [ ] `git diff --stat` contains ONLY files inside the task's stated scope (§1 signal 1)
- [ ] No debug artifacts: `grep -rn "console\.log\|print(" <changed files>` returns only pre-existing/intentional hits
- [ ] Spec artifacts updated if behavior changed: spec version + Changelog, `specs/STATUS.md` row
- [ ] For PRs: `/speckit.analyze` reports zero findings; diff ≤ 5 files and ≤ 300 non-test lines (else split)
- [ ] A fresh-context verifier (not you) has confirmed the above per [01-dispatch.md](01-dispatch.md) §5 — for any change > trivial (> 20 lines or > 1 file)

"It should work now", "the main functionality is complete", "tests would pass" — these phrases are banned. Either the boxes are checked or the status is NOT done.

## §3 Circuit-breaker — stop autonomous work and ask the user

Trigger on ANY of these. Ask with: current state · what was tried · the specific decision needed · your recommended option.

1. **Two-round cap hit**: same subtask failed 2 rounds at the highest justified model tier ([01-dispatch.md](01-dispatch.md) §4).
2. **Ambiguity fork**: two readings of the spec lead to different API contracts, schemas, or user-visible behavior. (One reading only affects internals → pick the simpler, note it in the report.)
3. **Irreversible or outward-facing action**: deleting files not created this session, `git push --force*`, merging a PR, publishing, schema migrations against a shared DB, anything touching secrets/auth boundaries.
4. **Rule conflict discovered**: two governance documents disagree (see harness README Invariant 3) — report, don't pick.
5. **Scope inflation**: honest completion requires > 10 files or > 300 LoC beyond what was requested.
6. **Constitution tension**: the requested change appears to violate Generalization-First (hardcoded task logic) or Data Fairness (answer leakage). Never implement a constitution violation silently.
7. **Taste decision** (§4) with no covering design token / ADR / spec value.
8. **Academic framing**: anything that changes the thesis Demo Paper's claims or evaluation methodology.

## §4 Taste-decision protocol (weak-model hard limit)

Weak models MUST NOT freestyle on aesthetics, branding, or "which design feels better":

1. First: resolve from existing sources in priority order — `label-suite-design` skill tokens → `design/system/MASTER.md` → existing pages in `design/prototype/` → ADRs.
2. If a source covers it: apply it verbatim; cite the source in the report.
3. If nothing covers it: produce **2–3 concrete candidates** (screenshots or rendered HTML), a one-line tradeoff each, and ask the user to pick. Do NOT invent a new style, color, spacing scale, or icon and ship it.
4. Never argue taste with the user. If the user picks candidate B, B is correct.
