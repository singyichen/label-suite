import { test, expect } from '@playwright/test';

/*
 * Issue #489/#491 regression cover for task-detail.
 *
 * Before this fix the same T014 dry-run IAA appeared as four mutually
 * contradictory hardcoded numbers across the prototype (0.72 / 0.00 /
 * 0.68 / 0.85), none of them derived from the seeded marks. task-detail
 * was the 0.00 one: resetRunProgressData() zeroed currentAgreement, and
 * every consumer coerced that 0 into a rendered "0.00" that reads as
 * "total disagreement" rather than "no data yet".
 *
 * T014's seed matrix (annotation-workspace.data.js, five samples x three
 * annotators on single_label sentiment) yields Krippendorff nominal
 * Do = 4.0000, De = 9.7143, n = 15 -> alpha = 0.5882, i.e. BELOW the 0.80
 * threshold. So the correct rendering is a not-met 0.59, and the pill must
 * say not-met -- while the publish button stays enabled, because
 * dataset-017 FR-039 makes IAA advisory rather than a hard gate.
 *
 * These assertions were absent when the fix landed: the whole
 * task-management suite stayed green because no test had ever asserted
 * T014's IAA at all.
 */

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';

test.describe('task-detail derives T014 IAA from marks (issue #489/#491)', () => {
  test('renders the derived 0.59, not the old hardcoded 0.00 or 0.68', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T014`);
    const value = page.locator('#currentAgreementValue');
    await expect(value).toHaveText('0.59');
  });

  test('agrees with computeIaaAlpha() rather than carrying its own number', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T014`);
    const alpha = await page.evaluate(() =>
      (window as any).LabelSuiteAnnotationWorkspaceData
        .computeIaaAlpha('T014', 'dry_run', 'single_label'),
    );
    expect(alpha.computable).toBe(true);
    expect(alpha.alpha).toBeCloseTo(0.5882, 4);
    await expect(page.locator('#currentAgreementValue')).toHaveText(alpha.alpha.toFixed(2));
  });

  test('marks the IAA pill not-met, and never as passed', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T014`);
    const pill = page.locator('#stopAgreementPill');
    await expect(pill).not.toHaveClass(/passed/);
    await expect(pill).not.toHaveClass(/not-computable/);
  });

  test('keeps the official-run action enabled despite the miss (FR-039 advisory)', async ({ page }) => {
    /* T014 ships as dry_run_in_progress, where the action row legitimately
       offers "start trial round R2" and no official-run button exists at all
       -- so asserting on T014's default state would pass vacuously. The
       &status= override puts the task at the one point where IAA could
       plausibly gate: waiting_iaa_confirmation, with alpha 0.5882 < 0.80.

       Why the seed: since issue #1120 group 1 T014's trial round consumes all
       5 of its own records, so its remaining official pool is 0, and FR-022
       (014 task-detail) correctly disables the official-run CTA for THAT
       reason. This case pins the IAA axis only, so it seeds a persisted
       round 1 (same localStorage mechanism as persistTrialRunState()) that
       leaves a non-zero pool while keeping the 0.5882 miss. */
    await page.addInitScript(
      ([key, state]) => window.localStorage.setItem(key as string, JSON.stringify(state)),
      [
        'labelsuite.trialRunState',
        {
          T014: {
            status: 'waiting_iaa_confirmation',
            trialRounds: [
              {
                round: 1,
                sampleCount: 3,
                agreement: 0.5882,
                annotators: 3,
                std: 0.1,
                result: 'failed',
                usedSamples: 3,
                date: '2026-08-22',
                noteZh: '第一回合 IAA 未達標。',
                noteEn: 'Round 1 IAA missed the target.',
                iaaComputationStatus: 'done',
              },
            ],
          },
        },
      ],
    );
    await page.goto(`${TASK_DETAIL_URL}?task_id=T014&status=waiting_iaa_confirmation`);
    await expect(page.locator('#currentAgreementValue')).toHaveText('0.59');
    await expect(page.locator('#stopAgreementPill')).not.toHaveClass(/passed/);
    const pool = Number(await page.locator('#officialPoolValue').textContent());
    expect(pool).toBeGreaterThan(0);
    const btn = page.locator('#publishOfficialRunBtn');
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
    await expect(page.locator('#publishActionRow')).not.toContainText(
      /IAA 未達標|IAA 計算中|IAA 計算失敗/,
    );
  });

  test('shows "無法計算" instead of 0.00 when no marks support an alpha', async ({ page }) => {
    /* T003 is an official_run task with no trial-round history, so no
       round supplies an alpha and none is derivable from its marks.
       dataset-017 FR-039 point 4 forbids falling back to any number here.
       T015 was the fixture until issue #1120 gave it a historical trial
       round R1 (IAA 0.62), so its field now correctly shows 0.62. */
    await page.goto(`${TASK_DETAIL_URL}?task_id=T003`);
    const value = page.locator('#currentAgreementValue');
    await expect(value).toHaveText('無法計算');
    await expect(value).not.toHaveText('0.00');
  });
});
