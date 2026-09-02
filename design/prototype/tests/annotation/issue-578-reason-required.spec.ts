import { test, expect, type Page } from '@playwright/test';
import {
  assertNoPageErrors,
  buildWorkspaceUrl,
  dismissGuidelineModal,
  skipGuidelineModal,
  trackPageErrors,
} from './_workspace-helpers';

/* Issue #578 group E, FR-089 (spec 015 delta v4.61.0): action reason
 * required.
 *
 * Two of FR-089's four reason-required actions -- reviewer 退回
 * (`rejected`) and 修正 (`modified`) -- already enforce a reason through the
 * FR-016A / issue #552 flow (see issue-552-reject-reason-required.spec.ts);
 * that persistence path (reviewer submission `reasons`) is unchanged here.
 * This spec pins the other two, BOTH of which are net-new production points
 * as of this version, not existing behavior being tightened:
 *
 *   - AC-2.20: the annotator "跳過" (skip) action does not exist anywhere in
 *     the prototype today -- no button, no `skipped` history event producer.
 *     It is being introduced from scratch as a reason-required action: an
 *     empty reason must never let a `skipped` event reach history at all.
 *
 *   - AC-3.50: `submitArbitration()` (annotation-workspace.data.js) already
 *     writes votes and `finalized_value`/`finalized_by`, but -- unlike every
 *     other terminal action in the workspace -- writes NO history event.
 *     This spec's positive case therefore asserts the mere EXISTENCE of an
 *     `adjudicated` event as much as its `reason`; today `getSampleHistory()`
 *     can never contain one no matter what the arbiter does.
 *
 * Blocking follows the established convention (FR-016A / issue #552,
 * config.js's `refreshReviewSubmitState`): a missing reason is signalled by
 * a `data-submit-blocked="reason"` attribute on the submit control, NEVER
 * `disabled`/`aria-disabled` -- the click must still reach the handler so a
 * toast can fire. The negative assertions below read the persisted history
 * through `getSampleHistory()` rather than trusting the UI's silence, per
 * the Data Fairness / FR-090 testing rule: "the event does not exist" must
 * be verified in the data a viewer could actually obtain, not just in what
 * happens to be un-rendered.
 *
 * New testids introduced by this contract (none exist pre-v4.61.0):
 *   ws-skip-btn, ws-skip-reason           -- annotator skip entry (AC-2.20)
 *   ws-arbitration-reason (data-item-id)  -- per dispute-item reason (AC-3.50)
 *
 * AC-2.20 scope, pinned per FR-089 (delta commit 0f37b79):
 *   - The skip entry renders in the ANNOTATOR view only -- the reviewer view
 *     must never show it (skip is not a reviewer action).
 *   - Availability follows FR-013A's three sample states (`已提交` /
 *     `已儲存` / `待標記`, i.e. submitted / saved / pending): `pending` and
 *     `saved` samples can be skipped; an already-`submitted` sample cannot.
 *   - Skip does NOT change sample status -- `skipped` is a history event
 *     only, never a fourth value of `entryStatus()`. This spec deliberately
 *     asserts no status-label change and does not touch the annotation-list
 *     status filter's option array (see annotation-list-reviewer.spec.ts:
 *     121-123, which pins that array exactly).
 *   - Navigation after a skip reuses the existing FR-022A/FR-022C
 *     next-sample rule; there is no skip-specific navigation to test here.
 *
 * AC-3.50's `adjudicated` event is written into the ANNOTATOR bucket with
 * the event's own `role` hard-set to `'reviewer'` (the same shape
 * `markSampleRejected` uses), NOT into the arbiter's own reviewer bucket --
 * `getSampleHistory()` (annotation-workspace.data.js:505) drops any
 * non-annotator bucket whose entry isn't `submitted`, and an arbiter
 * typically has no submitted reviewer submission of their own. `readHistory`
 * below therefore always reads back via the annotator identity, matching
 * what the annotator's own history tab would show.
 */

type HistoryEvent = {
  action: string;
  role: string;
  actorId: string | null;
  at: string;
  reason?: string;
};

type WorkspaceData = {
  markSampleSubmitted: (
    taskId: string, role: string, runType: string, sampleId: string,
    payload: unknown, historySummary: string,
    identity: { annotatorId?: string; reviewerId?: string }
  ) => void;
  markSampleSaved: (
    taskId: string, role: string, runType: string, sampleId: string,
    payload: unknown, historySummary: string,
    identity: { annotatorId?: string; reviewerId?: string }
  ) => void;
  getSampleHistory: (
    taskId: string, runType: string, sampleId: string,
    identity: { annotatorId?: string }
  ) => HistoryEvent[];
};

const TASK = 'T001';
const SAMPLE = 'sent-001';
const ANNOTATOR = 'kioleemg12';
const PARTICIPANT = 'reviewer_wang';
const FILLER = 'reviewer_lin'; // no can_arbitrate; issue #551 -- silent agree, keeps N=2
const ARBITER = 'reviewer_chen'; // can_arbitrate: true
const ITEM_ID = 'single_label::single_label';

const SKIP_REASON = '樣本敘述過於模糊，標記員無法判斷任何類別';
const ADJUDICATE_REASON = '多數審核員支持 B 版本，依多數意見裁定採用 fear';

/* Cast rather than `declare global`: annotation-workspace-arbitration.spec.ts
 * already augments `Window.LabelSuiteAnnotationWorkspaceData` with a
 * differently shaped WorkspaceData, and TS requires merged global
 * declarations to be structurally identical (same pattern as
 * issue-199-arbitration-vote-dedup.spec.ts). */
function readHistory(page: Page): Promise<HistoryEvent[]> {
  // Literal 'T001' / 'sent-001' / 'kioleemg12' below must track
  // TASK / SAMPLE / ANNOTATOR: page.evaluate() stringifies this callback and
  // re-runs it in the browser, so it cannot close over the outer TS consts.
  return page.evaluate(() => {
    return (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData.getSampleHistory('T001', 'official_run', 'sent-001', {
        annotatorId: 'kioleemg12',
      });
  });
}

const labelPayload = (selected: string) => ({ previewState: { single_label: { selected } } });

function seed(
  page: Page,
  args: { role: string; payload: unknown; identity: { annotatorId?: string; reviewerId?: string } }
): Promise<void> {
  return page.evaluate((a) => {
    (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
        'T001', a.role, 'official_run', 'sent-001', a.payload, '', a.identity
      );
  }, args);
}

// Seeds a `saved` (not `submitted`) sample -- used by the AC-2.20 availability
// tests, which per FR-013A must treat `pending` and `saved` samples as
// skippable and only an already-`submitted` sample as not skippable.
function seedSaved(
  page: Page,
  args: { role: string; payload: unknown; identity: { annotatorId?: string; reviewerId?: string } }
): Promise<void> {
  return page.evaluate((a) => {
    (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData.markSampleSaved(
        'T001', a.role, 'official_run', 'sent-001', a.payload, '', a.identity
      );
  }, args);
}

/* Same seed as annotation-workspace-arbitration.spec.ts: annotator sad,
   reviewer_wang fear, reviewer_lin silently agrees (sad) -> a genuine 1:1
   tie at N=2 (issue #551 -- N=1 would converge on its own and never reach
   the UI arbitration card), one open item for reviewer_chen to decide. */
async function seedDisputedUnit(page: Page): Promise<void> {
  await seed(page, { role: 'annotator', payload: labelPayload('sad'), identity: { annotatorId: ANNOTATOR } });
  await seed(page, {
    role: 'reviewer',
    payload: labelPayload('fear'),
    identity: { annotatorId: ANNOTATOR, reviewerId: PARTICIPANT },
  });
  await seed(page, {
    role: 'reviewer',
    payload: labelPayload('sad'),
    identity: { annotatorId: ANNOTATOR, reviewerId: FILLER },
  });
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('AC-2.20: annotator skip requires a reason', () => {
  async function openAnnotator(page: Page) {
    await page.goto(
      buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'annotator', run_type: 'official_run', annotator_id: ANNOTATOR })
    );
    await dismissGuidelineModal(page);
  }

  test('the skip entry point exists, with a required reason field blocked while empty', async ({ page }) => {
    const errors = trackPageErrors(page);
    await openAnnotator(page);

    const skipBtn = page.getByTestId('ws-skip-btn');
    const reasonField = page.getByTestId('ws-skip-reason');
    await expect(skipBtn).toBeVisible();
    await expect(reasonField).toBeVisible();
    await expect(reasonField).toHaveAttribute('required', '');
    // Nothing typed yet -- the blocked convention (data attribute, not
    // disabled) must already reflect that on render, same as the reviewer
    // reject-reason field's refresh().
    await expect(skipBtn).toHaveAttribute('data-submit-blocked', 'reason');

    assertNoPageErrors(errors);
  });

  test('skipping without a reason is blocked and writes no skipped event', async ({ page }) => {
    await openAnnotator(page);

    const skipBtn = page.getByTestId('ws-skip-btn');
    // Not `disabled` / `aria-disabled`: the click must still reach the
    // handler so it can surface a toast (established FR-016A convention).
    await skipBtn.click();

    await expect(skipBtn).toHaveAttribute('data-submit-blocked', 'reason');
    await expect(page.locator('#toast')).toHaveClass(/toast-warning/);
    await expect(page.locator('#toastMsg')).toContainText('理由');

    const history = await readHistory(page);
    expect(history.some((e) => e.action === 'skipped')).toBe(false);
  });

  test('skipping with a reason writes exactly one skipped event carrying it', async ({ page }) => {
    await openAnnotator(page);

    await page.getByTestId('ws-skip-reason').fill(SKIP_REASON);
    const skipBtn = page.getByTestId('ws-skip-btn');
    await expect(skipBtn).not.toHaveAttribute('data-submit-blocked', 'reason');

    await skipBtn.click();

    const history = await readHistory(page);
    const skipped = history.filter((e) => e.action === 'skipped');
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toBe(SKIP_REASON);
  });

  test('the reviewer view never renders the skip entry point (annotator-only action)', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({
      task_id: TASK, sample_id: SAMPLE, role: 'reviewer', run_type: 'official_run',
      annotator_id: ANNOTATOR, reviewer_id: PARTICIPANT,
    }));
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-skip-btn')).toHaveCount(0);
    await expect(page.getByTestId('ws-skip-reason')).toHaveCount(0);
  });

  test('an already-submitted sample is not skippable', async ({ page }) => {
    // Seeding via the data-layer global requires an already-navigated page
    // (window.LabelSuiteAnnotationWorkspaceData only exists after the app
    // script has loaded), so open the page before seeding, then reload to
    // pick up the seeded bucket -- same order as seedDisputedUnit's callers.
    await openAnnotator(page);
    await seed(page, { role: 'annotator', payload: labelPayload('sad'), identity: { annotatorId: ANNOTATOR } });
    await page.reload();
    await dismissGuidelineModal(page);

    // FR-013A: the sample stays `已提交` (submitted); skip must not be
    // offered as an entry point for it at all (not merely blocked-on-click).
    await expect(page.getByTestId('ws-skip-btn')).toHaveCount(0);
  });

  test('a saved (not yet submitted) sample remains skippable', async ({ page }) => {
    await openAnnotator(page);
    await seedSaved(page, { role: 'annotator', payload: labelPayload('sad'), identity: { annotatorId: ANNOTATOR } });
    await page.reload();
    await dismissGuidelineModal(page);

    // FR-013A: `已儲存` (saved) is one of the two states -- alongside
    // `待標記` (pending) -- for which skip must remain available.
    await expect(page.getByTestId('ws-skip-btn')).toBeVisible();
  });
});

/* issue #596 FR-061 point 3 narrowed AC-3.50/FR-089: only the third exit
   (兩者皆非 / reject) requires a reason now -- 採 A and 採 B finalize on an
   answer already on the record. Canonical FR-089 still reads
   "爭議仲裁（adjudicated）理由必填" unconditionally and the change carries no
   MODIFIED delta for it; flagged for the archive group's write-back. These
   tests follow FR-061, which is what the implementation does. */
test.describe('AC-3.50: the 兩者皆非 arbitration exit requires a reason', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(buildWorkspaceUrl({
      task_id: TASK, sample_id: SAMPLE, role: 'reviewer', run_type: 'official_run',
      annotator_id: ANNOTATOR, reviewer_id: ARBITER,
    }));
    await seedDisputedUnit(page);
    await page.reload();
    await dismissGuidelineModal(page);
    await expect(page.getByTestId('ws-arbitration-card')).toBeVisible();
  });

  test('the open dispute item renders a per-item reason field', async ({ page }) => {
    const reasonField = page.getByTestId('ws-arbitration-reason');
    await expect(reasonField).toHaveCount(1);
    await expect(reasonField).toHaveAttribute('data-item-id', ITEM_ID);
  });

  test('adopting A or B submits without a reason (FR-061 point 3 scoping)', async ({ page }) => {
    const submitBtn = page.getByTestId('ws-arbitration-submit');

    // issue #596 FR-061 point 3 narrowed the reason to the third exit only:
    // 採 A / 採 B pick an answer that is already on the card and on the
    // record, so there is nothing left to justify. Only 兩者皆非 introduces
    // a value nobody proposed, and that is the one the blocker guards.
    await page.getByTestId('ws-arbitration-choose-a').click();
    await expect(submitBtn).not.toHaveAttribute('data-submit-blocked', 'reason');
    await page.getByTestId('ws-arbitration-choose-b').click();
    await expect(submitBtn).not.toHaveAttribute('data-submit-blocked', 'reason');
  });

  test('finalizing without a reason is blocked, names the item, and writes no adjudicated event', async ({ page }) => {
    await page.getByTestId('ws-arbitration-choose-reject').click();

    const submitBtn = page.getByTestId('ws-arbitration-submit');
    // Choosing 兩者皆非 must already surface the reason blocker, same live
    // refresh-on-decision convention as the reviewer reason field.
    await expect(submitBtn).toHaveAttribute('data-submit-blocked', 'reason');

    await submitBtn.click();
    await expect(page.locator('#toast')).toHaveClass(/toast-warning/);
    // AC-3.50: the block must NAME the item missing a reason, not just
    // report "something is missing".
    await expect(page.locator('#toastMsg')).toContainText('single_label');

    const history = await readHistory(page);
    expect(history.some((e) => e.action === 'adjudicated')).toBe(false);
  });

  test('finalizing with a reason writes exactly one adjudicated event carrying it', async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.getByTestId('ws-arbitration-choose-reject').click();
    await page.getByTestId('ws-arbitration-reason').fill(ADJUDICATE_REASON);

    const submitBtn = page.getByTestId('ws-arbitration-submit');
    await expect(submitBtn).not.toHaveAttribute('data-submit-blocked', 'reason');
    await submitBtn.click();

    const history = await readHistory(page);
    const adjudicated = history.filter((e) => e.action === 'adjudicated');
    expect(adjudicated).toHaveLength(1);
    expect(adjudicated[0].reason).toBe(ADJUDICATE_REASON);

    assertNoPageErrors(errors);
  });
});
