/**
 * issue #568 -- every reviewer-perspective submit button lives in the fixed
 * bottom action bar. "送出審核" (ws-review-submit-btn) already did; "送出仲裁"
 * (ws-arbitration-submit) was appended inside the arbitration card and
 * scrolled with it. Contract: the arbitration submit is a child of
 * .action-bar, the card carries no submit button, and the existing click
 * behaviour (incomplete -> warning toast; complete -> finalized) is kept.
 */
import { expect, test, type Page } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, fillArbitrationReasons } from './_workspace-helpers';

const ARBITER_URL = buildWorkspaceUrl({
  task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: 'official_run',
  annotator_id: 'kioleemg12', reviewer_id: 'reviewer_chen',
});

test.describe('issue #568 arbitration submit lives in the action bar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ARBITER_URL);
    await seedDisputedUnit(page);
    await page.reload();
    await dismissGuidelineModal(page);
    await expect(page.getByTestId('ws-arbitration-card')).toBeVisible();
  });

  test('送出仲裁在底部操作列內，仲裁卡內無送出按鈕', async ({ page }) => {
    await expect(page.getByTestId('ws-arbitration-submit')).toBeVisible();
    await expect(page.locator('.action-bar [data-testid="ws-arbitration-submit"]')).toHaveCount(1);
    await expect(page.getByTestId('ws-arbitration-card').locator('button.btn-cta')).toHaveCount(0);
    /* Same slot as 送出審核: the review submit stays hidden while arbitrating. */
    await expect(page.getByTestId('ws-review-submit-btn')).toBeHidden();
  });

  test('操作列版本的送出仲裁保留既有行為', async ({ page }) => {
    const submit = page.getByTestId('ws-arbitration-submit');
    await submit.click();
    await expect(page.locator('#toastMsg')).toHaveText('請完成所有爭議項目的裁定');
    await page.getByTestId('ws-arbitration-choose-a').click();
    await fillArbitrationReasons(page);
    await submit.click();
    await expect(page.getByTestId('ws-review-finalized-card')).toBeVisible();
    await expect(submit).toBeHidden();
  });

  test('非爭議單位不顯示送出仲裁', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({
      task_id: 'T001', sample_id: 'sent-002', role: 'reviewer', run_type: 'official_run',
      annotator_id: 'kioleemg12', reviewer_id: 'reviewer_chen',
    }));
    await dismissGuidelineModal(page);
    await expect(page.getByTestId('ws-arbitration-submit')).toBeHidden();
  });
});

async function seedDisputedUnit(page: Page) {
  const labelPayload = (selected: string) => ({ previewState: { single_label: { selected } } });
  const seeds: Array<{ role: string; payload: unknown; identity: { annotatorId?: string; reviewerId?: string } }> = [
    { role: 'annotator', payload: labelPayload('sad'), identity: { annotatorId: 'kioleemg12' } },
    { role: 'reviewer', payload: labelPayload('fear'), identity: { annotatorId: 'kioleemg12', reviewerId: 'reviewer_wang' } },
    { role: 'reviewer', payload: labelPayload('sad'), identity: { annotatorId: 'kioleemg12', reviewerId: 'reviewer_lin' } },
  ];
  for (const s of seeds) {
    await page.evaluate((a) => {
      const data = (window as unknown as {
        LabelSuiteAnnotationWorkspaceData: { markSampleSubmitted: (...args: unknown[]) => void };
      }).LabelSuiteAnnotationWorkspaceData;
      data.markSampleSubmitted('T001', a.role, 'official_run', 'sent-001', a.payload, '', a.identity);
    }, s);
  }
}
