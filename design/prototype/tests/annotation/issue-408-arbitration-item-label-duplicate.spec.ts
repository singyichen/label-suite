import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* Arbitration/finalized item labels double up the outKey for output types
 * with no sub-key (issue #408, RV-05).
 *
 * `buildArbitrationItemRow()` and `buildArbitrationResolvedRow()` both build
 * the label as `item.outKey + ' · ' + item.key`. `compareOutputAnswer()`'s
 * default branch (single_label / single_dim / free_text -- anything without
 * a merge key) sets `diff.key = outKey`, so `item.key === item.outKey` for
 * every dispute item on these output types, and the label reads
 * "single_label · single_label" instead of just "single_label".
 */

const ANNOTATOR = 'kioleemg12';
const PARTICIPANT = 'reviewer_wang'; // dispute participant
const ARBITER = 'reviewer_chen'; // can_arbitrate: true, non-participant

const labelPayload = (selected: string) => ({ previewState: { single_label: { selected } } });

function seed(
  page: Page,
  args: { role: string; payload: unknown; identity: { annotatorId?: string; reviewerId?: string } }
): Promise<void> {
  return page.evaluate((a) => {
    (window as any).LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
      'T001', a.role, 'official_run', 'sent-001', a.payload, '', a.identity
    );
  }, args);
}

test.describe('issue #408 -- arbitration/finalized item labels do not duplicate the outKey', () => {
  test('live arbitration item row: single_label dispute renders the outKey once', async ({ page }) => {
    await skipGuidelineModal(page);
    // Same seed/identity shape as annotation-workspace-arbitration.spec.ts:
    // annotator says sad, reviewer_wang says fear -> one disputed
    // single_label::single_label item; reviewer_chen is the eligible
    // non-participant arbiter, so it lands directly on the arbitration
    // layout.
    await page.goto(buildWorkspaceUrl({
      task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: 'official_run',
      annotator_id: ANNOTATOR, reviewer_id: ARBITER,
    }));
    await seed(page, { role: 'annotator', payload: labelPayload('sad'), identity: { annotatorId: ANNOTATOR } });
    await seed(page, {
      role: 'reviewer', payload: labelPayload('fear'),
      identity: { annotatorId: ANNOTATOR, reviewerId: PARTICIPANT },
    });
    await page.reload();

    const item = page.getByTestId('ws-arbitration-item').first();
    await expect(item).toBeVisible();
    const label = item.locator('div').first();
    await expect(label).toHaveText('single_label');
    await expect(label).not.toHaveText('single_label · single_label');
  });

  test('finalized resolved row: single_label converged item renders the outKey once', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({
      task_id: 'T015', sample_id: 'ofs-03-arbitrated-gold', role: 'reviewer', run_type: 'official_run',
    }));

    const row = page.getByTestId('ws-finalized-resolved');
    await expect(row).toBeVisible();
    await expect(row).toContainText('neutral');
    await expect(row).not.toContainText('single_label · single_label');
    // The row must still lead with the outKey once, not drop it entirely.
    await expect(row).toContainText(/^single_label：/);
  });
});
