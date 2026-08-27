import { test, expect } from '@playwright/test';
import { buildListUrl } from './_workspace-helpers';

/* Issue #489: the same T014 dry run reported four different hardcoded IAA
 * figures (0.72 / 0.00 / 0.68 / 0.85), none derived from the marks.
 * `computeIaaAlpha` is now the single derivation; these assertions pin it to
 * the T014 seed so a future edit to the seed cannot silently drift the
 * number back into fiction.
 *
 * Expected value derived independently from the T014 dry_run seed matrix
 * (annotation-workspace.data.js, 5 samples x 3 annotators, single_label):
 *
 *   dry-01  positive positive positive
 *   dry-02  neutral  neutral  positive
 *   dry-03  neutral  neutral  neutral
 *   dry-04  negative neutral  negative
 *   dry-05  positive positive positive
 *
 *   Do = 4.0000   De = 9.7143   n = 15   alpha = 0.5882
 *
 * 0.5882 is BELOW IAA_THRESHOLD_SINGLE_LABEL (0.80) on purpose: the demo
 * task must exercise the not-met branch, which the old 0.81 fixture never
 * did (issue #488 decision T1 -- the warning is advisory, not a hard gate,
 * precisely because a real dry run can land here).
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

async function alphaFor(page: import('@playwright/test').Page, taskId: string, runType: string, outKey: string) {
  return page.evaluate(
    ([t, r, k]) =>
      (window as unknown as {
        LabelSuiteAnnotationWorkspaceData: { computeIaaAlpha: (a: string, b: string, c: string) => Alpha };
      }).LabelSuiteAnnotationWorkspaceData.computeIaaAlpha(t, r, k),
    [taskId, runType, outKey]
  );
}

test.describe('issue #489: computeIaaAlpha is the single IAA derivation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run' }));
    await page.waitForFunction(
      () => Boolean((window as unknown as { LabelSuiteAnnotationWorkspaceData?: unknown }).LabelSuiteAnnotationWorkspaceData)
    );
  });

  test('T014 dry_run single_label alpha matches the seed matrix', async ({ page }) => {
    const result = await alphaFor(page, 'T014', 'dry_run', 'single_label');
    expect(result.computable).toBe(true);
    expect(result.observed).toBeCloseTo(4.0, 6);
    expect(result.expected).toBeCloseTo(9.714285714, 6);
    expect(result.values).toBe(15);
    expect(result.units).toBe(5);
    expect(result.raters).toBe(3);
    expect(result.alpha).toBeCloseTo(0.588235, 5);
  });

  test('alpha lands below the single_label threshold, exercising the not-met branch', async ({ page }) => {
    const result = await alphaFor(page, 'T014', 'dry_run', 'single_label');
    expect(result.alpha as number).toBeLessThan(0.8);
  });

  test('official_run has one annotator per sample, so alpha is not computable', async ({ page }) => {
    const result = await alphaFor(page, 'T015', 'official_run', 'single_label');
    expect(result.computable).toBe(false);
    expect(result.reason).toBe('insufficient_samples');
  });

  test('non-nominal output types report unsupported rather than a number', async ({ page }) => {
    const result = await alphaFor(page, 'T014', 'dry_run', 'multi_dim');
    expect(result.computable).toBe(false);
    expect(result.reason).toBe('unsupported_output_type');
    expect(result.alpha).toBeUndefined();
  });

  test('an unknown task never coerces to a value', async ({ page }) => {
    const result = await alphaFor(page, 'T999', 'dry_run', 'single_label');
    expect(result.computable).toBe(false);
    expect(result.reason).toBe('unknown_task');
    expect(result.alpha).toBeUndefined();
  });
});
