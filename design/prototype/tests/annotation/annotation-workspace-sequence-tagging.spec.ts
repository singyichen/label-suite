import { test, expect } from '@playwright/test';
import {
  buildWorkspaceUrl,
  dismissGuidelineModal,
  selectWorkspaceText,
  skipGuidelineModal,
} from './_workspace-helpers';

/* sequence_tagging annotator interaction (issue #581, OpenSpec change
 * seq-tagging-span-workspace). The token grid and the BIO tag buttons are
 * retired: the annotator drags over the untokenized source text and picks a
 * label type, and the answer is a list of half-open character offsets.
 *
 * The sample round-trip case that used to live here moves to this change's
 * group 2, where the CompactAnswer shape it depends on is migrated.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md
 *   FR-024A, FR-024A-1, FR-024J
 */

/* sequence-tagging-001 (task-detail.data.js) — 台積電董事長魏哲家今天出席台北國際半導體論壇並發表主題演講
 * with 4 pre-annotated spans: ORG [0,3) · PER [6,9) · TIME [9,11) · LOC [13,15).
 * 國際半導體 is the [15,20) stretch, the longest run no pre-annotation claims. */
const NEW_SPAN_TEXT = '國際半導體';

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('sequence_tagging output type', () => {
  test('renders the source text with its pre-annotated spans and no token grid', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T006', sample_id: 'sequence-tagging-001' }));
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-input-content')).toBeVisible();
    await expect(page.getByTestId('ws-seq-span-item')).toHaveCount(4);
    await expect(page.getByTestId('ws-seq-token')).toHaveCount(0);
    await expect(page.getByTestId('ws-seq-tag-btn-PER')).toHaveCount(0);
  });

  test('dragging a stretch of text then choosing a label adds a span', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T006', sample_id: 'sequence-tagging-001' }));
    await dismissGuidelineModal(page);

    await selectWorkspaceText(page, 'ws-input-content', NEW_SPAN_TEXT);
    await page.getByTestId('ws-seq-label-btn-ORG').click();

    await expect(page.getByTestId('ws-seq-span-item')).toHaveCount(5);
    const added = page.getByTestId('ws-input-content').locator('[data-start="15"]');
    await expect(added).toHaveAttribute('data-end', '20');
    await expect(added).toHaveAttribute('data-label', 'ORG');
  });

  test('deleting a span from the marked-span list removes its highlight', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T006', sample_id: 'sequence-tagging-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-seq-span-delete').first().click();

    await expect(page.getByTestId('ws-seq-span-item')).toHaveCount(3);
    await expect(page.getByTestId('ws-input-content').locator('[data-start="0"]')).toHaveCount(0);
  });

  test('bypass locks the label chips and the marked-span list', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T006', sample_id: 'sequence-tagging-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-bypass-sequence_tagging').check();

    await expect(page.getByTestId('ws-seq-label-btn-PER')).toBeDisabled();
    await expect(page.getByTestId('ws-seq-span-delete').first()).toBeDisabled();
  });
});
