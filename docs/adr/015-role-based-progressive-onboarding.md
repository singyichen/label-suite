# ADR-015: Role-Based Progressive Onboarding

**Status**: Accepted
**Date**: 2026-04-14

## Context

Label Suite contains flows for at least two distinct user groups:

- **Researchers / task owners** who create tasks, configure labels, import data, preview, publish, and review results.
- **Annotators** who open an assigned task, read instructions, complete annotations, and submit work.

These users do not share the same goals, vocabulary, or critical-path actions. A single generic onboarding flow would either:

- overload users with irrelevant information,
- delay time-to-value by front-loading feature explanations, or
- fail to provide help at the moment of need.

The project also follows a config-driven, design-first approach (ADR-010, ADR-014). That makes onboarding especially important because:

1. **The system exposes flexible but potentially complex setup paths** for researchers.
2. **Annotators must understand task instructions and interaction rules quickly** to avoid labeling errors.
3. **A poor first-use experience directly increases abandonment risk** before users reach the first successful outcome.

The primary product need is not "explaining all features". It is helping each user reach their first successful outcome with minimal friction.

### First Successful Outcomes

For researchers / task owners, the first successful outcome is typically:

1. create a task,
2. define labels or task rules,
3. import data,
4. preview the task, and
5. publish or otherwise reach a runnable state.

For annotators, the first successful outcome is typically:

1. enter a task,
2. understand instructions,
3. complete at least one annotation correctly, and
4. submit the work.

The question is how onboarding should be introduced so it improves activation without creating noise or forced friction.

## Decision

Adopt a **role-based, progressive onboarding strategy** for Label Suite.

Onboarding will be designed around the user's first successful outcome, not around a full product tour.

### Core Rules

1. **Segment onboarding by role**
   - Researchers / task owners and annotators receive different onboarding content and sequencing.
   - Admin-oriented setup guidance must not be shown to annotators.
   - Annotation workflow guidance must not be mixed with task-creation guidance unless the user explicitly switches context.

2. **Prefer contextual guidance over front-loaded walkthroughs**
   - Show guidance when the user first encounters a complex screen, empty state, or critical action.
   - Do not require users to sit through a full-tour modal before using the product.

3. **Guide the critical path first**
   - The first onboarding implementation must cover only one end-to-end critical flow at a time.
   - Researcher path priority: `Create task -> Configure labels/rules -> Import data -> Preview -> Publish`
   - Annotator path priority: `Open task -> Read instructions -> Complete first annotation -> Submit`

4. **Make onboarding optional but recoverable**
   - First-time hints may appear automatically.
   - Users must be able to skip onboarding.
   - Users must be able to reopen onboarding from a persistent help entry point.
   - Progress may be saved so users can resume later.

5. **Teach only what is hard or high-risk**
   - Do not add hints for obvious controls.
   - Use onboarding for confusing, high-consequence, or low-discoverability interactions only.

### Initial UX Pattern Set

The first implementation should use lightweight patterns with low product and engineering cost:

| Pattern | Purpose | Initial Usage |
|--------|---------|---------------|
| Welcome banner / welcome panel | Explain page purpose and next step | First entry to a complex area |
| Empty-state guidance | Tell users what to do when no data/task exists | Task list, dataset list, results pages |
| Contextual tooltip / coach mark | Explain a specific control at first encounter | Complex config or task interaction UI |
| Onboarding checklist | Show progress through critical setup steps | Researcher setup flow |

### Explicit Non-Goals for Phase 1

The following are intentionally deferred:

- a mandatory full-screen product tour,
- long multi-step modal walkthroughs across the entire system,
- feature-by-feature explanations for every page,
- highly customized onboarding per task type before core role-based flows are validated.

### Measurement

Onboarding effectiveness must be evaluated through product metrics, not subjective preference alone.

Track at least:

1. **First-time completion rate** of the critical task flow.
2. **Drop-off rate** before first successful outcome.
3. **Short-term retention / return rate** after completing onboarding or the first task.

## Consequences

### Easier

- Users reach product value faster because onboarding is tied to the next required action.
- Researchers and annotators get relevant guidance instead of a mixed, noisy tour.
- Engineering scope stays controlled because the first release can be built from lightweight UI primitives.
- Empty states become actionable product surfaces instead of dead ends.
- The onboarding system remains compatible with future role expansion and task-specific extensions.

### Harder

- Product and frontend must maintain onboarding state per role, per flow, and possibly per page.
- Analytics instrumentation becomes required to determine whether onboarding actually improves activation.
- Some users may skip guidance and still need support; help entry points must remain visible.
- Contextual hints require discipline to avoid accumulating stale or repetitive prompts as the UI evolves.

## Implementation Guidance

Phase 1 should be treated as an MVP and limited to:

1. **Researcher onboarding**
   - Welcome guidance on task creation surfaces
   - Empty-state prompts for zero-task / zero-data situations
   - Checklist for `Create -> Configure -> Import -> Preview -> Publish`

2. **Annotator onboarding**
   - Instruction emphasis when entering a task for the first time
   - Contextual tooltip for the core annotation interaction if needed
   - Confirmation / next-step prompt after first successful submission

3. **System capabilities**
   - Per-user dismissal state
   - Reopen from Help / Learn entry point
   - Event tracking for impression, skip, completion, and first-success milestones

## Alternatives Rejected

| Option | Reason Rejected |
|--------|-----------------|
| Single onboarding flow for all users | Researcher and annotator goals are different; generic onboarding would be noisy and inefficient |
| Mandatory full product tour before usage | Increases friction and delays first task completion |
| Explain every feature on first visit | Information-heavy and not aligned with just-in-time learning |
| Build advanced interactive tutorials first | Higher implementation cost than justified before validating the critical-path onboarding model |
