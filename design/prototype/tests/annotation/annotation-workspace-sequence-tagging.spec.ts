import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, skipGuidelineModal } from './_workspace-helpers';

/* sequence_tagging annotator interaction (spec 015 v2.0.0, ADR-031). T006:
 * PER/ORG/LOC/TIME entities, BIO scheme, character-unit tokenization
 * (frozen contract — tokens[] come from the fixture, not client-side
 * re-tokenization), allow_bypass=true configured natively.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md
 *   FR-024A, FR-024A-1, FR-024J
 */

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

/* issue #581 / OpenSpec change seq-tagging-span-config group 2 replaced the
   sequence_tagging token grid with span drag-select over the raw text, so the
   ws-seq-token cells and the BIO tag buttons every test here drives no longer
   render. The token coordinate system these assertions encode is exactly what
   #581 retires, so they are rewritten -- not repaired -- by the annotation/015
   change that owns the workspace surface. */
test.describe.skip('sequence_tagging output type', () => {
  test('renders one token per pre-tokenized unit from the frozen tokenization contract', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T006', sample_id: 'sequence-tagging-001' }));
    await dismissGuidelineModal(page);

    // sequence-tagging-001 has 29 character-unit tokens (task-detail.data.js).
    await expect(page.getByTestId('ws-seq-token')).toHaveCount(29);
    await expect(page.getByTestId('ws-seq-token').first()).toHaveText('台');
  });

  test('selecting a tag type then a token span applies a BIO tag to the answer', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T006', sample_id: 'sequence-tagging-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-seq-tag-btn-PER').click();
    await page.getByTestId('ws-seq-token').nth(6).click();
    await expect(page.getByTestId('ws-seq-token').nth(6)).toHaveAttribute('data-tag', 'B-PER');
  });

  test('tags survive switching away to another sample and back', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T006', sample_id: 'sequence-tagging-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-seq-tag-btn-PER').click();
    await page.getByTestId('ws-seq-token').nth(6).click();

    await page.getByTestId('ws-sample-item').nth(1).click();
    await page.getByTestId('ws-sample-item').nth(0).click();
    await expect(page.getByTestId('ws-seq-token').nth(6)).toHaveAttribute('data-tag', 'B-PER');
  });

  test('bypass checkbox clears and disables tagging', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T006', sample_id: 'sequence-tagging-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-seq-tag-btn-PER').click();
    await page.getByTestId('ws-seq-token').nth(6).click();

    await page.getByTestId('ws-bypass-sequence_tagging').check();
    await expect(page.getByTestId('ws-seq-token').nth(6)).toHaveAttribute('data-tag', 'O');
    await expect(page.getByTestId('ws-seq-tag-btn-PER')).toBeDisabled();
  });
});
