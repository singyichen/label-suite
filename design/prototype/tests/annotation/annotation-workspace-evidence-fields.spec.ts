import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, skipGuidelineModal } from './_workspace-helpers';

/* Evidence-role field reference card, general fallback (spec 015 FR-024N,
 * issue #89). task-management-013 FR-003g-2 (v3.1.0) removed the Evidence
 * card from Step 2's labeling preview for every output type except
 * `free_text` (the only one declaring `rendersEvidencePreview: true`), and
 * stated Evidence content for the rest is "deferred to the labeling
 * workspace". FR-024H/AC-2B.3 already cover the free_text path; this spec
 * covers the general fallback for the other 7 OUTPUT_TYPE_KEYS.
 *
 * T005 (multi_dim): `field_role_map = { source: 'evidence', translation:
 * 'input', gold_scores: 'output' }` -- multi_dim does not declare
 * rendersEvidencePreview, so this is exactly the gap FR-024N fills.
 * T001 (single_label): `field_role_map = { text: 'input', gold_label:
 * 'output' }` -- no evidence field at all, negative control. */

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('evidence-role field reference card (general fallback, FR-024N)', () => {
  test('a task with an evidence-role field renders it read-only, before the input content and answer control', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T005', sample_id: 'mt-001' }));
    await dismissGuidelineModal(page);

    const evidenceCard = page.getByTestId('ws-evidence-card');
    const inputContent = page.getByTestId('ws-input-content');
    const answerPanel = page.getByTestId('ws-output-panel-multi_dim');

    await expect(evidenceCard).toBeVisible();
    await expect(evidenceCard).toContainText('Chronic kidney disease');
    // Read-only: no input/textarea/select/button inside the reference card.
    await expect(evidenceCard.locator('input, textarea, select, button')).toHaveCount(0);

    const [evidenceBox, inputBox, answerBox] = await Promise.all([
      evidenceCard.boundingBox(),
      inputContent.boundingBox(),
      answerPanel.boundingBox(),
    ]);
    expect(evidenceBox!.y).toBeLessThan(inputBox!.y);
    expect(inputBox!.y).toBeLessThan(answerBox!.y);
  });

  test('a task without an evidence-role field shows no reference card', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-evidence-card')).toHaveCount(0);
  });
});
