import { test, expect } from '@playwright/test';
import { buildListUrl } from './_workspace-helpers';

/* Issue #866: getReviewUnitRows() (annotation-workspace.data.js:1671, issue
 * #792) is the single review-unit enumeration source -- the union of
 * REVIEWER_MOCK_ROWS demo rows and any annotator with a stored SUBMITTED
 * answer for the run_type. computeIaaAlpha() (:3553) and countDistinctRaters()
 * (:3624) still enumerate raters by walking getReviewerMockRows() alone
 * (:1650), so an annotator who has a stored submission but no demo row is
 * invisible to IAA: they show up in the review list, get assigned a
 * reviewer, and count toward pending review load, but never count toward
 * the rater/value set alpha is computed from -- systematically inflating
 * alpha.
 *
 * FALSE-GREEN TRAP: T014's REVIEWER_MOCK_ROWS are exactly the three
 * annotators seedReviewFlowDemo() writes submissions for (kioleemg12 /
 * 113450022 / tony0950127, 5 samples each). Switching the enumeration to
 * getReviewUnitRows() does not move a single value for the stock seed --
 * the union is already fully covered by the mock rows. These tests
 * therefore write a genuinely new annotator's SUBMITTED answer into
 * localStorage themselves (via the same markSampleSubmitted() entry point
 * seedReviewFlowDemo() uses -- annotation-workspace.data.js:3474) and pin
 * the delta, not an absolute figure, so the assertions cannot pass by
 * accident against the unmodified seed and will not go stale when the seed
 * matrix is edited later.
 */

type Alpha = {
  computable: boolean;
  alpha?: number;
  observed?: number;
  expected?: number;
  units?: number;
  values?: number;
  raters?: number;
  reason?: string;
};

type WorkspaceDataWindow = {
  LabelSuiteAnnotationWorkspaceData: {
    computeIaaAlpha: (taskId: string, runType: string, outKey: string) => Alpha;
    markSampleSubmitted: (
      taskId: string,
      role: string,
      runType: string,
      sampleId: string,
      payload: { previewState: { single_label: { selected: string } } },
      historySummary: string,
      identity: { annotatorId: string }
    ) => void;
    markSampleSaved: (
      taskId: string,
      role: string,
      runType: string,
      sampleId: string,
      payload: { previewState: { single_label: { selected: string } } },
      historySummary: string,
      identity: { annotatorId: string }
    ) => void;
  };
};

async function alphaFor(page: import('@playwright/test').Page, taskId: string, runType: string, outKey: string) {
  return page.evaluate(
    ([t, r, k]) =>
      (window as unknown as WorkspaceDataWindow).LabelSuiteAnnotationWorkspaceData.computeIaaAlpha(t, r, k),
    [taskId, runType, outKey]
  );
}

/* Same entry point / payload shape seedReviewFlowDemo() itself uses
 * (annotation-workspace.data.js:3467, 3474): {previewState:{single_label:
 * {selected: value}}} via markSampleSubmitted(taskId, 'annotator', runType,
 * sampleId, payload, summary, {annotatorId}). */
async function submitAnswer(
  page: import('@playwright/test').Page,
  taskId: string,
  runType: string,
  sampleId: string,
  annotatorId: string,
  value: string
) {
  await page.evaluate(
    ([t, r, s, a, v]) =>
      (window as unknown as WorkspaceDataWindow).LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
        t,
        'annotator',
        r,
        s,
        { previewState: { single_label: { selected: v } } },
        '',
        { annotatorId: a }
      ),
    [taskId, runType, sampleId, annotatorId, value]
  );
}

async function saveDraftAnswer(
  page: import('@playwright/test').Page,
  taskId: string,
  runType: string,
  sampleId: string,
  annotatorId: string,
  value: string
) {
  await page.evaluate(
    ([t, r, s, a, v]) =>
      (window as unknown as WorkspaceDataWindow).LabelSuiteAnnotationWorkspaceData.markSampleSaved(
        t,
        'annotator',
        r,
        s,
        { previewState: { single_label: { selected: v } } },
        '',
        { annotatorId: a }
      ),
    [taskId, runType, sampleId, annotatorId, value]
  );
}

test.describe('issue #866: IAA rater enumeration matches the review-unit union', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run' }));
    await page.waitForFunction(
      () => Boolean((window as unknown as { LabelSuiteAnnotationWorkspaceData?: unknown }).LabelSuiteAnnotationWorkspaceData)
    );
  });

  test('a submitted answer from an annotator outside the mock rows raises raters/values without moving units', async ({ page }) => {
    const baseline = await alphaFor(page, 'T014', 'dry_run', 'single_label');
    expect(baseline.computable).toBe(true);

    /* dry-01-all-agree and dry-02-one-divergent already have 3 raters each
     * (>=2), so they already count as units under the CURRENT buggy
     * implementation too -- adding a 4th rater to an already-qualifying
     * unit cannot create a new unit, isolating the assertion to raters/
     * values/alpha exactly as the fix should move them. */
    await submitAnswer(page, 'T014', 'dry_run', 'dry-01-all-agree', 'qa866-rater-d', 'negative');
    await submitAnswer(page, 'T014', 'dry_run', 'dry-02-one-divergent', 'qa866-rater-d', 'neutral');

    const after = await alphaFor(page, 'T014', 'dry_run', 'single_label');
    expect(after.computable).toBe(true);
    expect(after.raters).toBe((baseline.raters as number) + 1);
    expect(after.values).toBe((baseline.values as number) + 2);
    expect(after.units).toBe(baseline.units);
    expect(after.alpha).not.toBeCloseTo(baseline.alpha as number, 5);
  });

  test('countDistinctRaters (surfaced via computeIaaAlpha.raters) counts an outside-mock-row submitter', async ({ page }) => {
    const baseline = await alphaFor(page, 'T014', 'dry_run', 'single_label');
    expect(baseline.computable).toBe(true);

    /* dry-03-dispute-open already has 3 raters (all neutral); a single new
     * submission there is enough to isolate the rater-count delta from
     * value-count/unit-count concerns already covered by the previous
     * test. */
    await submitAnswer(page, 'T014', 'dry_run', 'dry-03-dispute-open', 'qa866-rater-e', 'positive');

    const after = await alphaFor(page, 'T014', 'dry_run', 'single_label');
    expect(after.computable).toBe(true);
    expect(after.raters).toBe((baseline.raters as number) + 1);
    expect(after.values).toBe((baseline.values as number) + 1);
    expect(after.units).toBe(baseline.units);
  });

  test('a draft-only (unsubmitted) answer from a new annotator never counts, per FR-055', async ({ page }) => {
    const baseline = await alphaFor(page, 'T014', 'dry_run', 'single_label');
    expect(baseline.computable).toBe(true);

    await saveDraftAnswer(page, 'T014', 'dry_run', 'dry-04-dispute-resolved', 'qa866-rater-f', 'negative');

    const after = await alphaFor(page, 'T014', 'dry_run', 'single_label');
    expect(after.computable).toBe(true);
    expect(after.raters).toBe(baseline.raters);
    expect(after.values).toBe(baseline.values);
    expect(after.units).toBe(baseline.units);
    expect(after.alpha).toBeCloseTo(baseline.alpha as number, 6);
  });
});
