import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* issue #596 (OpenSpec change 2026-09-01-single-owner-review-relay, task 3.1,
 * RED): the arbitration layout moves from the vote model (per-item A/B with
 * quorum context, majority convergence, implicit agree votes) to the FR-061
 * three-exit model -- 採 A / 採 B / 兩者皆非(reject) -- with B rendered
 * dynamically by decision source (AC-4.54) and the reject exit feeding the
 * final exception pool (FR-095).
 *
 * The CURRENT implementation (annotation-workspace.config.js
 * buildArbitrationCard() around :3781) still renders the OLD vote layout:
 * a `ws-arbitration-quorum` chip, per-item vote tallies, only two choices
 * (choose-a / choose-b) and no reject exit. Every case below is expected to
 * fail today for that reason -- see each test's own comment.
 *
 * --- Decided Red contract (task 3.2's Green implementation is wrong if it
 *     disagrees, not this test) ---
 *   - Kept testids (same naming convention, still meaningful under the
 *     three-exit model): `ws-arbitration-card`, `ws-arbitration-item`,
 *     `ws-arbitration-choose-a`, `ws-arbitration-choose-b`,
 *     `ws-arbitration-reason`, `ws-arbitration-submit`.
 *   - New testid: `ws-arbitration-choose-reject` -- the third exit
 *     (兩者皆非), following the existing choose-a/choose-b convention.
 *   - Removed testids (task 3.2; retired, never reused):
 *     `ws-arbitration-quorum`, `ws-arbitration-vote-tally`,
 *     `ws-arbitration-vote-reason`.
 *   - B option text (FR-061 point 2): source `modify` renders the
 *     reviewer's corrected raw value; source `bypass` renders the literal
 *     `審核員 Bypass（無法判定）` and no raw value -- "bypass stores no
 *     value" (design.md D2) is what makes the two sources distinguishable.
 *   - Reject exit (FR-061 points 3-4): reason REQUIRED; a reject submitted
 *     without a reason is blocked and writes nothing. A completed reject
 *     persists as an ARBITRATION record -- a vote with choice `reject`
 *     (ARBITRATION_OUTCOMES) plus its reason, and NO finalized_value /
 *     finalized_by -- per design.md D2's arbitration shape. The exception
 *     pool QUEUE is derived from unresolved reject records; the D2
 *     `exceptionPool` record (resolver_id / action / resolved_at) is the
 *     project leader's RESOLUTION, written only by task 6.2's pool flow,
 *     never at arbitration-submit time. (An earlier revision of this file
 *     wrongly asserted a `labelsuite.wsExceptionPool` write here --
 *     corrected to the D2-conformant shape before any Green landed.) The
 *     unit's derived status stays `disputed` until the pool is resolved.
 *
 * Seeding: same data-layer idiom as the sibling
 * issue-596-review-unit-status.spec.ts -- markSampleSubmitted() via
 * page.evaluate; a differing reviewer payload derives `modify` (D6 compat),
 * a no-answer reviewer payload derives `bypass` (design.md D3). Arbiter
 * eligibility (FR-060) comes from the group-1 demo roster:
 * reviewer_chen has can_arbitrate and never participates in these units.
 *
 * Traceability: openspec/changes/2026-09-01-single-owner-review-relay/
 *   specs/annotation/015-annotation-workspace/spec.md FR-060 (AC-4.53),
 *   FR-061 (AC-4.54), FR-095; design.md D2 (shapes), D3 (bypass adopts as
 *   無法判定); tasks.md task 3.1.
 */

type Identity = { annotatorId?: string; reviewerId?: string };

type WorkspaceData = {
  markSampleSubmitted: (
    taskId: string, role: string, runType: string, sampleId: string,
    payload: unknown, historySummary: string, identity: Identity
  ) => void;
  getReviewUnitStatus: (
    taskId: string, runType: string, sampleId: string,
    identity: Identity, outKeys: string[]
  ) => string | null;
  getArbitrationState: (
    taskId: string, runType: string, sampleId: string, identity: Identity
  ) => unknown;
};

/* No `declare global` here: annotation-workspace-arbitration.spec.ts already
 * declares this window property with its own (different) shape, and a second
 * declaration collides (TS2717). Cast per evaluate call instead -- the same
 * idiom annotation-review-unit.spec.ts uses. */

const TASK = 'T001';
const SAMPLE = 'sent-001';
const ANNOTATOR = 'kioleemg12';
const PARTICIPANT = 'reviewer_wang'; // dispute participant; must not arbitrate
const ARBITER = 'reviewer_chen'; // demo roster: can_arbitrate, non-participant

const labelPayload = (selected: string) => ({ previewState: { single_label: { selected } } });
/* design.md D3: bypass carries no replacement value -- an empty submission
 * derives decision = bypass for the outKey (no selection at all). */
const noAnswerPayload = () => ({ previewState: {} });

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

async function seedDisputedUnit(page: Page, reviewerPayload: unknown): Promise<void> {
  /* Load the workspace once so annotation-workspace.data.js is present
   * before the evaluate-based seeding (about:blank has no data layer). */
  await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'annotator' }));
  await seed(page, { role: 'annotator', payload: labelPayload('sad'), identity: { annotatorId: ANNOTATOR } });
  await seed(page, {
    role: 'reviewer',
    payload: reviewerPayload,
    identity: { annotatorId: ANNOTATOR, reviewerId: PARTICIPANT },
  });
}

function gotoAsArbiter(page: Page) {
  return page.goto(buildWorkspaceUrl({
    task_id: TASK, sample_id: SAMPLE, role: 'reviewer', run_type: 'official_run',
    annotator_id: ANNOTATOR, reviewer_id: ARBITER,
  }));
}

function unitStatus(page: Page): Promise<string | null> {
  return page.evaluate(() =>
    (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData.getReviewUnitStatus(
        'T001', 'official_run', 'sent-001', { annotatorId: 'kioleemg12' }, ['single_label']
      )
  );
}

/* Serialized arbitration state for the unit -- shape-agnostic on item keys
 * so the assertions pin only what design.md D2 fixes: the choice value, the
 * reason, and the absence of finalization. */
function arbitrationStateJson(page: Page): Promise<string> {
  return page.evaluate(() =>
    JSON.stringify(
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData.getArbitrationState(
          'T001', 'official_run', 'sent-001', { annotatorId: 'kioleemg12' }
        ) || {}
    )
  );
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #596: FR-061 three-exit arbitration layout (AC-4.54)', () => {
  test('every dispute item offers 採A／採B／兩者皆非 and no vote elements render', async ({ page }) => {
    await seedDisputedUnit(page, labelPayload('fear'));
    await gotoAsArbiter(page);

    const item = page.getByTestId('ws-arbitration-item').first();
    await expect(page.getByTestId('ws-arbitration-card')).toHaveCount(1);
    await expect(item.getByTestId('ws-arbitration-choose-a')).toHaveCount(1);
    await expect(item.getByTestId('ws-arbitration-choose-b')).toHaveCount(1);
    // Fails today: buildArbitrationCard() renders only the A/B pair -- the
    // third exit does not exist yet (layout is still the vote model).
    await expect(item.getByTestId('ws-arbitration-choose-reject')).toHaveCount(1);

    // v5.0.0 removals (task 3.2): no majority-vote element may render.
    // Fails today: the quorum chip is unconditionally rendered (:3802).
    await expect(page.getByTestId('ws-arbitration-quorum')).toHaveCount(0);
    await expect(page.getByTestId('ws-arbitration-vote-tally')).toHaveCount(0);
    await expect(page.getByTestId('ws-arbitration-vote-reason')).toHaveCount(0);

    // FR-061 point 1: the arbiter picks a side, never re-annotates -- the
    // three-way review decision controls must not co-render.
    await expect(page.getByTestId('ws-review-row-approve')).toHaveCount(0);
    await expect(page.getByTestId('ws-review-row-modify')).toHaveCount(0);
    await expect(page.getByTestId('ws-review-row-bypass')).toHaveCount(0);
  });

  test('B renders the corrected value when the decision source is 修正', async ({ page }) => {
    await seedDisputedUnit(page, labelPayload('fear'));
    await gotoAsArbiter(page);

    const item = page.getByTestId('ws-arbitration-item').first();
    await expect(item.getByTestId('ws-arbitration-choose-b')).toContainText('fear');
    await expect(item.getByTestId('ws-arbitration-choose-b')).not.toContainText('審核員 Bypass');
    /* Tripwire (same pattern as issue-596-review-three-way.spec.ts): the
     * value rendering above also holds under today's vote layout, so anchor
     * this case to the three-exit contract to make it fail today for the
     * same "layout is still the vote model" reason as its siblings. */
    await expect(item.getByTestId('ws-arbitration-choose-reject')).toHaveCount(1);
  });

  test('B renders 審核員 Bypass（無法判定） when the decision source is 無法判定', async ({ page }) => {
    await seedDisputedUnit(page, noAnswerPayload());
    await gotoAsArbiter(page);

    const item = page.getByTestId('ws-arbitration-item').first();
    // Fails today: the vote layout passes the raw (absent) reviewer value
    // through to the B option instead of the Bypass wording (AC-4.54).
    await expect(item.getByTestId('ws-arbitration-choose-b')).toContainText('審核員 Bypass（無法判定）');
  });

  test('兩者皆非 requires a reason, then records a reject vote with the unit still 爭議中', async ({ page }) => {
    await seedDisputedUnit(page, labelPayload('fear'));
    await gotoAsArbiter(page);

    const item = page.getByTestId('ws-arbitration-item').first();
    // Fails today: the reject exit does not exist in the vote layout.
    await expect(item.getByTestId('ws-arbitration-choose-reject')).toHaveCount(1);
    await item.getByTestId('ws-arbitration-choose-reject').click();

    // FR-061 point 3: reason REQUIRED -- submitting without one is blocked
    // and writes nothing at all (point 4).
    await page.getByTestId('ws-arbitration-submit').click();
    expect(await arbitrationStateJson(page)).not.toContain('"choice":"reject"');
    expect(await unitStatus(page)).toBe('disputed');

    await item.getByTestId('ws-arbitration-reason').fill('兩者皆非（測試理由）');
    await page.getByTestId('ws-arbitration-submit').click();

    // FR-061 point 4 / design.md D2: the reject persists as an arbitration
    // vote carrying its reason, and finalizes NOTHING -- no finalized_value,
    // no finalized_by. (The D2 exceptionPool record is the project leader's
    // later resolution, task 6.2 -- never written at arbitration submit.)
    await expect.poll(() => arbitrationStateJson(page)).toContain('"choice":"reject"');
    const state = await arbitrationStateJson(page);
    expect(state).toContain('兩者皆非（測試理由）');
    expect(state).not.toContain('"finalized_by"');
    expect(state).not.toContain('"finalized_value"');
    // ...and the unit stays 爭議中 until the pool is resolved (AC-4.54).
    expect(await unitStatus(page)).toBe('disputed');
  });
});
