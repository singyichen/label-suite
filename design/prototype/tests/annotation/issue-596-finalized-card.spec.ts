import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* issue #596 (OpenSpec change 2026-09-01-single-owner-review-relay, task 3.3,
 * RED): the finalized review unit stops being a vote-breakdown card and
 * becomes FR-094's pure-text read-only card carrying a single-line micro
 * conflict trace.
 *
 * The CURRENT implementation (annotation-workspace.config.js
 * renderFinalizedCard() around :3831) still renders the removed FR-069
 * per-reviewer vote table (`ws-finalized-vote`, one row per reviewer, with
 * the majority-convergence note 「已依審核員多數決收斂」) and no trace line
 * at all. Every case below is expected to fail today -- see each test's own
 * comment for which assertion does the failing.
 *
 * --- Decided Red contract (task 3.4's Green implementation is wrong if it
 *     disagrees with this file, not the other way round) ---
 *
 *   - Kept testid: `ws-review-finalized-card`.
 *   - New testid: `ws-finalized-trace` -- ONE line per unit, prefixed 歷程：
 *     and joining the unit's responsibility chain with ` ➔ `.
 *   - New testid: `ws-trace-actor` -- each chain segment that names an
 *     account is a real <button> per MASTER.md §Tooltip, carrying
 *     `data-actor-role` (annotator | reviewer | arbiter | exception_pool)
 *     and `aria-describedby` pointing at its own `ws-trace-account`
 *     role="tooltip" bubble holding the FULL account id. FR-094 point 2
 *     forbids the native `title` attribute.
 *   - Removed testid (task 3.4; retired, never reused): `ws-finalized-vote`.
 *
 *   - Segment vocabulary (A/B are the SAME positional letters the
 *     arbitration layout already uses -- `A・標記員` / `B・審核員`, FR-061
 *     point 2 -- not truncated account names; the account behind each
 *     letter is what the tooltip expands):
 *       1. `標記 A`                       always present
 *       2. `審核 B（通過｜修正｜無法判定）`  the reviewer's decision for the
 *          unit; bypass renders 無法判定, per FR-094 point 2's explicit
 *          「來源為 bypass 時該段呈現為 審核 B（無法判定）」
 *       3. `仲裁 A｜B`                     present only when arbitration
 *          finalized a dispute item; the letter is the adopted side
 *          (adopt_a -> A, adopt_b -> B)
 *       4. `例外池 {處置}`                 present only when the final
 *          exception pool closed a dispute item; MUST be the last segment
 *
 *   - Pure text (FR-094 point 1 / AC-3.52): the card renders NO answer
 *     control at all, including `disabled` ones -- no input, select or
 *     textarea anywhere inside it, no `ws-review-row-*` decision control on
 *     the page, and no visible submit button. The only <button> the card may
 *     contain is a `ws-trace-actor` tooltip trigger.
 *
 * Seeding: the same data-layer idiom as the sibling
 * issue-596-arbitration.spec.ts -- markSampleSubmitted() via page.evaluate.
 * A reviewer payload whose answer differs derives `modify`; an empty
 * reviewer payload derives `bypass` (design.md D3). Arbitration is written
 * with the exported submitArbitration(); the exception-pool RESOLUTION
 * record is written straight to localStorage in design.md D2's shape,
 * because its write path (FR-095's project-leader screen) belongs to group
 * 6 and does not exist yet.
 *
 * Traceability: openspec/changes/2026-09-01-single-owner-review-relay/
 *   specs/annotation/015-annotation-workspace/spec.md FR-094 (+ its
 *   scenario), FR-053's 已定稿單位鎖定 / AC-3.52, FR-069 REMOVED note;
 *   design.md D1 (status derivation), D2 (arbitration / exceptionPool
 *   shapes), D3 (bypass adopted as 無法判定); tasks.md task 3.3.
 */

type Identity = { annotatorId?: string; reviewerId?: string };

type DisputeItem = { outKey: string; key: string; annotatorValue: unknown };

type WorkspaceData = {
  markSampleSubmitted: (
    taskId: string, role: string, runType: string, sampleId: string,
    payload: unknown, historySummary: string, identity: Identity
  ) => void;
  getDisputeItems: (
    taskId: string, runType: string, sampleId: string,
    identity: Identity, outKeys: string[]
  ) => DisputeItem[];
  submitArbitration: (
    taskId: string, runType: string, sampleId: string, identity: Identity,
    decisions: { itemId: string; choice: string; value: unknown; reason?: string }[]
  ) => void;
  getReviewUnitStatus: (
    taskId: string, runType: string, sampleId: string,
    identity: Identity, outKeys: string[]
  ) => string | null;
};

/* No `declare global`: annotation-workspace-arbitration.spec.ts already
 * declares this window property with a different shape and a second
 * declaration collides (TS2717). Cast per evaluate call instead. */

const TASK = 'T001';
const SAMPLE = 'sent-001';
const OUT_KEY = 'single_label';
const ANNOTATOR = 'kioleemg12';
const REVIEWER = 'reviewer_wang';
const ARBITER = 'reviewer_chen'; // demo roster: can_arbitrate, non-participant
const LEAD = 'lead@labelsuite.io';

const labelPayload = (selected: string) => ({ previewState: { single_label: { selected } } });

function seed(
  page: Page,
  args: { role: string; payload: unknown; identity: Identity }
): Promise<void> {
  return page.evaluate((a) => {
    (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
        'T001', a.role, 'official_run', 'sent-001', a.payload, '', a.identity
      );
  }, args);
}

/* Loads the workspace once so annotation-workspace.data.js exists, then
 * seeds the annotator plus one reviewer whose decision is `decision`. */
async function seedUnit(page: Page, decision: 'approve' | 'modify' | 'bypass'): Promise<void> {
  await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'annotator' }));
  await seed(page, {
    role: 'annotator',
    payload: labelPayload('sad'),
    identity: { annotatorId: ANNOTATOR },
  });
  const reviewerPayload =
    decision === 'approve'
      ? { ...labelPayload('sad'), decisions: { [OUT_KEY]: 'approve' }, reasons: {}, values: {} }
      : decision === 'modify'
        ? {
            ...labelPayload('happy'),
            decisions: { [OUT_KEY]: 'modify' },
            reasons: { [OUT_KEY]: 'tone is positive' },
            values: { [OUT_KEY]: 'happy' },
          }
        /* design.md D2: bypass writes NO values[outKey] -- the absent field
           is the sentinel, so the payload carries no answer at all. */
        : {
            previewState: {},
            decisions: { [OUT_KEY]: 'bypass' },
            reasons: { [OUT_KEY]: 'ambiguous sample' },
            values: {},
          };
  await seed(page, {
    role: 'reviewer',
    payload: reviewerPayload,
    identity: { annotatorId: ANNOTATOR, reviewerId: REVIEWER },
  });
}

/* Arbitrates every open dispute item of the unit with one choice. `value`
 * is what the adopted side holds; adopt_b on a bypass item adopts "no
 * determination", which design.md D3 stores as the reviewer's absent value
 * (null), never the annotator's answer. */
function arbitrate(page: Page, choice: 'adopt_a' | 'adopt_b', value: unknown): Promise<void> {
  return page.evaluate((a) => {
    const data = (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData;
    const identity = { annotatorId: 'kioleemg12', reviewerId: 'reviewer_wang' };
    const items = data.getDisputeItems('T001', 'official_run', 'sent-001', identity, ['single_label']);
    data.submitArbitration(
      'T001', 'official_run', 'sent-001',
      { annotatorId: 'kioleemg12', reviewerId: 'reviewer_chen' },
      items.map((item) => ({
        itemId: item.outKey + '::' + item.key,
        choice: a.choice,
        value: a.value,
        reason: 'arbiter call',
      }))
    );
  }, { choice, value });
}

/* design.md D2's exceptionPool blob: one record per outKey under
 * `labelsuite.wsExceptionPool.<taskId>::<runType>::<annotatorId>::<sampleId>`.
 * Group 6 owns the write UI; this is the storage contract it will write. */
function seedExceptionPoolResolution(page: Page, action: string): Promise<void> {
  return page.evaluate((a) => {
    window.localStorage.setItem(
      'labelsuite.wsExceptionPool.T001::official_run::kioleemg12::sent-001',
      JSON.stringify({
        single_label: {
          resolver_id: a.lead,
          action: a.action,
          finalized_value: 'neutral',
          reason: 'lead decided',
          resolved_at: new Date().toISOString(),
        },
      })
    );
  }, { action, lead: LEAD });
}

function gotoAsReviewer(page: Page) {
  return page.goto(buildWorkspaceUrl({
    task_id: TASK, sample_id: SAMPLE, role: 'reviewer', run_type: 'official_run',
    annotator_id: ANNOTATOR, reviewer_id: REVIEWER,
  }));
}

test.describe('issue #596 FR-094: pure-text finalized card + micro conflict trace', () => {
  /* Each test gets a fresh browser context (empty localStorage); the init
     script only silences the first-visit guideline modal. */
  test.beforeEach(async ({ page }) => {
    await skipGuidelineModal(page);
  });

  /* FAILS TODAY: `ws-finalized-trace` does not exist -- renderFinalizedCard()
     emits the title, the note and one plain line per outKey, then jumps
     straight to the resolved/vote rows. */
  test('a modified-then-arbitrated unit traces 標記 A ➔ 審核 B（修正）➔ 仲裁 B', async ({ page }) => {
    await seedUnit(page, 'modify');
    await arbitrate(page, 'adopt_b', 'happy');
    await gotoAsReviewer(page);

    const card = page.getByTestId('ws-review-finalized-card');
    await expect(card).toBeVisible();

    const trace = page.getByTestId('ws-finalized-trace');
    await expect(trace).toHaveCount(1);
    await expect(trace).toHaveText('歷程：標記 A ➔ 審核 B（修正）➔ 仲裁 B');
  });

  /* FAILS TODAY: same missing trace; this case additionally pins FR-094
     point 2's bypass wording, which no code path produces at all. */
  test('a bypassed unit renders 審核 B（無法判定） in the trace', async ({ page }) => {
    await seedUnit(page, 'bypass');
    await arbitrate(page, 'adopt_b', null);
    await gotoAsReviewer(page);

    const trace = page.getByTestId('ws-finalized-trace');
    await expect(trace).toHaveText('歷程：標記 A ➔ 審核 B（無法判定）➔ 仲裁 B');
  });

  /* FAILS TODAY: missing trace. Also pins that adopt_a names the A side --
     the letter is the adopted side, not a fixed string. */
  test('adopt_a renders 仲裁 A as the last segment', async ({ page }) => {
    await seedUnit(page, 'modify');
    await arbitrate(page, 'adopt_a', 'sad');
    await gotoAsReviewer(page);

    await expect(page.getByTestId('ws-finalized-trace'))
      .toHaveText('歷程：標記 A ➔ 審核 B（修正）➔ 仲裁 A');
  });

  /* FAILS TODAY: missing trace. FR-094 point 2's 「經例外池收尾時末段為
     例外池 {處置}」 -- the pool closure replaces arbitration as the tail. */
  test('an exception-pool closure ends the trace with 例外池 {處置}', async ({ page }) => {
    await seedUnit(page, 'modify');
    await seedExceptionPoolResolution(page, 'adopt_annotator');
    await gotoAsReviewer(page);

    await expect(page.getByTestId('ws-review-finalized-card')).toBeVisible();
    await expect(page.getByTestId('ws-finalized-trace'))
      .toHaveText('歷程：標記 A ➔ 審核 B（修正）➔ 例外池 採用標記員答案');
  });

  /* FAILS TODAY: a unit whose reviewer approved everything derives
     FINALIZED with no dispute item, and the card still has no trace line. */
  test('an approved unit traces 標記 A ➔ 審核 B（通過） with no third segment', async ({ page }) => {
    await seedUnit(page, 'approve');
    await gotoAsReviewer(page);

    await expect(page.getByTestId('ws-finalized-trace'))
      .toHaveText('歷程：標記 A ➔ 審核 B（通過）');
  });

  /* FAILS TODAY: buildFinalizedVoteRows() still appends one
     `ws-finalized-vote` row per reviewer under every resolved item. */
  test('the retired FR-069 per-reviewer vote table is gone', async ({ page }) => {
    await seedUnit(page, 'modify');
    await arbitrate(page, 'adopt_b', 'happy');
    await gotoAsReviewer(page);

    await expect(page.getByTestId('ws-review-finalized-card')).toBeVisible();
    await expect(page.getByTestId('ws-finalized-vote')).toHaveCount(0);
    /* The majority-convergence note went with it: a single-reviewer unit
       has no majority to converge (FR-093). */
    await expect(page.getByTestId('ws-review-finalized-card')).not.toContainText('多數決');
  });

  /* FAILS TODAY on the trace assertion; the control assertions are the
     AC-3.52 guard that task 3.4's Green must not regress while adding it. */
  test('the card is pure text: no answer control, disabled or otherwise', async ({ page }) => {
    await seedUnit(page, 'modify');
    await arbitrate(page, 'adopt_b', 'happy');
    await gotoAsReviewer(page);

    const card = page.getByTestId('ws-review-finalized-card');
    await expect(card).toBeVisible();
    await expect(card.locator('input, select, textarea')).toHaveCount(0);
    /* Only the trace's tooltip triggers may be buttons. */
    await expect(card.locator('button:not([data-testid="ws-trace-actor"])')).toHaveCount(0);
    await expect(page.getByTestId('ws-review-row-approve')).toHaveCount(0);
    await expect(page.getByTestId('ws-review-row-modify')).toHaveCount(0);
    await expect(page.getByTestId('ws-review-row-bypass')).toHaveCount(0);
    await expect(page.locator('#wsReviewSubmitBtn')).toBeHidden();
    await expect(page.getByTestId('ws-finalized-trace')).toHaveCount(1);
  });

  /* FAILS TODAY: no `ws-trace-actor` exists, so the tooltip contract has
     nothing to hold. FR-094 point 2 + MASTER.md §Tooltip. */
  test('each account segment expands its full account on hover, never via title', async ({ page }) => {
    await seedUnit(page, 'modify');
    await arbitrate(page, 'adopt_b', 'happy');
    await gotoAsReviewer(page);

    const card = page.getByTestId('ws-review-finalized-card');
    await expect(card.locator('[title]')).toHaveCount(0);

    const actors = page.getByTestId('ws-trace-actor');
    await expect(actors).toHaveCount(3);
    await expect(actors.nth(0)).toHaveAttribute('data-actor-role', 'annotator');
    await expect(actors.nth(1)).toHaveAttribute('data-actor-role', 'reviewer');
    await expect(actors.nth(2)).toHaveAttribute('data-actor-role', 'arbiter');

    const annotatorBubbleId = await actors.nth(0).getAttribute('aria-describedby');
    expect(annotatorBubbleId).toBeTruthy();
    const bubble = page.locator('#' + annotatorBubbleId);
    await expect(bubble).toHaveAttribute('role', 'tooltip');
    await expect(bubble).toHaveText(ANNOTATOR);
    await expect(bubble).toBeHidden();
    await actors.nth(0).hover();
    await expect(bubble).toBeVisible();

    const arbiterBubbleId = await actors.nth(2).getAttribute('aria-describedby');
    await expect(page.locator('#' + arbiterBubbleId)).toHaveText(ARBITER);
  });
});
