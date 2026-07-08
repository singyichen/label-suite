---
name: adversarial-review
description: Adversarial review — for major conclusions/architecture decisions/bug root-cause verdicts/security judgments, dispatch a review panel in parallel (membership from the harness [review].panel setting) for independent review; adopt only if a majority survives. Triggers: "adversarial review", "challenge this", or the trigger conditions in HARNESS-PROTOCOL section 2. Not for: trivial changes, pure Q&A.
---

# Adversarial Review

## Purpose
Prevent "sounds right but is actually wrong" conclusions from being adopted. A single model reviewing itself systematically favors its own conclusions, so multiple **independent subagents with different lenses and a default stance of overturning** cross-examine it.

## Panel
Run `harness config` to see this project's `[review].panel`; the default is `skeptic`, `red-team`, `simplifier`. The full set of lenses:

| Agent | Lens |
|---|---|
| skeptic | logic holes, unverified inference |
| red-team | security risks and failure modes |
| simplifier | anti-overengineering |
| evidence-auditor | claim-by-claim evidence audit |
| user-advocate | requirement fit |

## Steps

1. **Prepare the review package**: write the conclusion under review as one self-contained statement: the conclusion itself (one sentence), the evidence behind it (file:line, test output), and the blast radius. Multiple independent findings must each be reviewed separately — never bundled.
2. **Dispatch the whole panel in parallel within one message** (Agent tool, subagent_type set to each panel member's name, all at once — never serially). Each agent's prompt = the review package verbatim + that lens's own task instructions.
3. **Verdict (majority-survival rule)**:
   - Majority SURVIVED → confirmed; the reasons behind any REFUTED vote must be listed as risks when reporting to the user.
   - No majority → **conclusion rejected**; fix it per the REFUTED reasons and resubmit.
4. **Report format** (required in the final message to the user): a verdict table with one row per member, plus one closing line: `Review result: N/M survived → confirmed / rejected (reason)`.

## Prohibitions
- Never skip a panel member to save time.
- Never merge multiple lenses into a single agent run (independence is the point).
- Never silently swallow REFUTED reasons — report or fix them.
