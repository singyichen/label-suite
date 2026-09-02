import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, fillArbitrationReasons, skipGuidelineModal } from './_workspace-helpers';

type WorkspaceData = {
  markSampleSubmitted: (
    taskId: string, role: string, runType: string, sampleId: string,
    payload: unknown, historySummary: string,
    identity: { annotatorId?: string; reviewerId?: string }
  ) => void;
};

/* Finalized review unit lock (issue #308, spec 015 v4.14.0).
 *
 * Design decision (recorded in the spec changelog): a FINALIZED unit is
 * fully read-only -- no decision rows, no direct-correction controls,
 * no submit path. The workspace renders a read-only results card plus a
 * finalized notice instead. The FR-016A "reopen with audit reason" flow is
 * deferred to the backend phase and deliberately NOT prototyped here.
 *
 * Before this fix the reviewer workspace re-rendered the normal interactive
 * review card on finalized units, so a reviewer could reject + submit on a
 * finalized official_run unit -- markSampleRejected() then rolled the
 * annotator's sample back to pending and erased the finalized unit (P0-2).
 *
 * Both finalize paths must lock:
 * - reviewer-approved: T015 ofs-01 and T017 oft-04
 * - arbitration-resolved: T015 ofs-03 (seeded arb) and the live path where
 *   the arbiter's own submit re-renders the unit into the locked card.
 *
 * issue #596 (FR-093) removed the interim band this file used to guard the
 * other side of: with exactly one reviewer per unit there is no "approved at
 * 1 of 2" state that stays interactive, so the T017 oft-02 regression case
 * is gone. What replaces it is the PENDING case -- a unit whose reviewer has
 * not submitted yet -- already covered by issue-307's overfire probe.
 */

function reviewerUrl(taskId: string, sampleId: string): string {
  return buildWorkspaceUrl({
    task_id: taskId, sample_id: sampleId, role: 'reviewer',
    run_type: 'official_run', reviewer_id: 'reviewer_chen',
  });
}

async function expectLockedCard(page: Page) {
  await expect(page.getByTestId('ws-review-finalized-card')).toBeVisible();
  for (const decision of ['approve', 'modify', 'bypass']) {
    await expect(page.getByTestId('ws-review-row-' + decision)).toHaveCount(0);
  }
  await expect(page.getByTestId('ws-review-correct-single_label')).toHaveCount(0);
  await expect(page.getByTestId('ws-review-submit-btn')).toBeHidden();
}

test.describe('issue #308 -- finalized review units are fully read-only', () => {
  test('T015 ofs-01: read-only card, no decision/correction/submit controls', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(reviewerUrl('T015', 'ofs-01-agree-gold'));

    await expect(page.locator('[data-testid="ws-review-unit-context"] .rv-unit-state'))
      .toHaveText('已定稿 · 已鎖定');
    await expectLockedCard(page);
    // The card still shows the reviewed result, read-only.
    await expect(page.getByTestId('ws-review-finalized-card')).toContainText('negative');

    // FR-058 shortcut path is blocked by the same hidden submit button.
    await page.keyboard.press('ControlOrMeta+Enter');
    await expect(page.locator('#toastMsg')).not.toHaveText('審核已送出');
  });

  test('T017 oft-04: read-only card once the unit is finalized', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(reviewerUrl('T017', 'oft-04-unanimous-gold'));

    await expect(page.locator('[data-testid="ws-review-unit-context"] .rv-unit-state'))
      .toHaveText('已定稿 · 已鎖定');
    await expectLockedCard(page);
  });

  test('T015 ofs-03 (arbitration-finalized seed): locked card lists the arbitrated value', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(reviewerUrl('T015', 'ofs-03-arbitrated-gold'));

    await expectLockedCard(page);
    // The resolved dispute row carries the arbitrated value, not an A/B vote UI.
    await expect(page.getByTestId('ws-finalized-resolved')).toHaveCount(1);
    await expect(page.getByTestId('ws-finalized-resolved')).toContainText('neutral');
    await expect(page.getByTestId('ws-arbitration-card')).toHaveCount(0);
  });

  /* Seeded in-test rather than off a demo row: every seeded dispute in
     data.js still encodes the retired multi-reviewer model (T016/T017 are
     rewritten by group 7, task 7.4), and on those rows the arbitration
     card's single B slot resolves to the wrong reviewer. FR-093's shape --
     one annotator, one dissenting reviewer, one arbiter -- is what this
     path is actually about, so build exactly that. ofs-05 is the one T015
     sample the demo seed leaves untouched. */
  test('live path: the arbiter finalizing a disputed unit lands on the locked card in the same session', async ({ page }) => {
    await skipGuidelineModal(page);
    const SAMPLE = 'ofs-05-not-submitted';
    await page.goto(reviewerUrl('T015', SAMPLE));
    await page.evaluate((sampleId) => {
      const data = (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData;
      const payload = (selected: string) => ({ previewState: { single_label: { selected } } });
      data.markSampleSubmitted('T015', 'annotator', 'official_run', sampleId, payload('neutral'), '', {});
      data.markSampleSubmitted('T015', 'reviewer', 'official_run', sampleId, payload('positive'), '', {
        reviewerId: 'reviewer_wang',
      });
    }, SAMPLE);
    await page.reload();

    // reviewer_chen carries can_arbitrate and filed no review of this unit.
    await expect(page.getByTestId('ws-arbitration-card')).toBeVisible();
    await page.getByTestId('ws-arbitration-choose-b').click();
    await fillArbitrationReasons(page);
    await page.getByTestId('ws-arbitration-submit').click();

    // The arbitration submit handler re-renders the workspace: the unit is
    // now finalized, so the arbitration card gives way to the locked card.
    await expectLockedCard(page);
    await expect(page.getByTestId('ws-arbitration-card')).toHaveCount(0);
    await expect(page.getByTestId('ws-finalized-resolved')).toContainText('positive');
    await expect(page.locator('[data-testid="ws-review-unit-context"] .rv-unit-state'))
      .toHaveText('已定稿 · 已鎖定');
  });
});
