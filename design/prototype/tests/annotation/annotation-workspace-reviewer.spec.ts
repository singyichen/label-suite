import { test, expect, type Page } from '@playwright/test';
import {
  assertNoPageErrors,
  buildWorkspaceUrl,
  dismissGuidelineModal,
  setRangeValue,
  skipGuidelineModal,
  trackPageErrors,
} from './_workspace-helpers';

/* Reviewer mode (FR-024L/FR-024L-1/FR-014A-C): registry-driven -- ALL 8
 * output types get a row-level direct-correction entry point that reuses
 * the corresponding annotator control, seeded with the annotator's
 * submitted answer. Also guards against the OLD workspace's
 * `summarizeReviewerAspectCorrections` ReferenceError on review submit
 * (annotation-workspace.html:5029) recurring in the rewrite.
 *
 * REWRITE (aggregate review card): the old per-outKey
 * ws-review-decision-approve/reject buttons are REMOVED. Every row now
 * carries a per-annotator ws-review-annotator-list with individual
 * ws-review-row-approve/ws-review-row-reject toggles, plus row-level
 * ws-review-bulk-approve/ws-review-bulk-reject shortcuts (see
 * annotation-workspace-review-card.spec.ts for full aggregate-card
 * coverage). This file keeps its original purpose -- the FR-024L direct
 * correction control reuse -- but drives the decision step through the new
 * bulk-approve flow instead of the removed per-outKey buttons, since
 * ws-review-submit-btn now requires every annotator row across every
 * output type to be decided before it will submit.
 *
 * Reviewer rows are sourced from an actual runtime annotator submission
 * (performed in-test via the real UI), not from a static "expected answer"
 * fixture -- the 13 seed profiles only ship one gold/output-role answer per
 * record, not simulated multi-annotator submissions.
 */

async function submitAsAnnotator(page: Page, taskId: string, sampleId: string, answer: () => Promise<void>) {
  await page.goto(buildWorkspaceUrl({ task_id: taskId, sample_id: sampleId, role: 'annotator' }));
  await dismissGuidelineModal(page);
  await answer();
  await page.getByTestId('ws-submit-btn').click();
}

/* Bulk-decides every ws-review-row on the page (each row's bulk-approve
 * covers that row's own annotator list, including any prepended "current"
 * row) so ws-review-submit-btn's "every row of every output type must be
 * decided" validation passes. */
async function bulkApproveAllRows(page: Page) {
  const rows = page.getByTestId('ws-review-row');
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    await rows.nth(i).getByTestId('ws-review-bulk-approve').click();
  }
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('reviewer direct correction — deep example (single_label, T001)', () => {
  test('row is seeded with the annotator answer and the correction control reuses the chip UI', async ({ page }) => {
    await submitAsAnnotator(page, 'T001', 'sent-001', async () => {
      await page.getByTestId('ws-single-label-chip-negative').click();
    });

    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer' }));
    await dismissGuidelineModal(page);

    const row = page.getByTestId('ws-review-row').first();
    await expect(row).toBeVisible();
    const correction = row.getByTestId('ws-review-correct-single_label');
    await expect(correction.getByTestId('ws-single-label-chip-negative')).toHaveAttribute('aria-pressed', 'true');

    await correction.getByTestId('ws-single-label-chip-positive').click();
    await expect(correction.getByTestId('ws-single-label-chip-positive')).toHaveAttribute('aria-pressed', 'true');
  });

  test('review submit does not throw and produces a populated review history', async ({ page }) => {
    const errors = trackPageErrors(page);

    await submitAsAnnotator(page, 'T001', 'sent-001', async () => {
      await page.getByTestId('ws-single-label-chip-negative').click();
    });

    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer' }));
    await dismissGuidelineModal(page);

    const row = page.getByTestId('ws-review-row').first();
    await row.getByTestId('ws-review-correct-single_label').getByTestId('ws-single-label-chip-positive').click();
    await bulkApproveAllRows(page);
    await page.getByTestId('ws-review-submit-btn').click();

    const history = page.getByTestId('ws-review-history');
    await expect(history).toBeVisible();
    const historyText = (await history.textContent()) || '';
    expect(historyText.trim().length).toBeGreaterThan(0);
    assertNoPageErrors(errors);
  });
});

const REGISTRY_CASES: Array<{
  outKey: string;
  taskId: string;
  sampleId: string;
  answer: (page: Page) => Promise<void>;
}> = [
  {
    outKey: 'single_label',
    taskId: 'T001',
    sampleId: 'sent-001',
    answer: async (page) => page.getByTestId('ws-single-label-chip-positive').click(),
  },
  {
    outKey: 'multi_label',
    taskId: 'T002',
    sampleId: 'emo-001',
    answer: async (page) => {
      await page.getByTestId('ws-multi-label-selector-toggle').click();
      await page.getByTestId('ws-multi-label-node-sad').click();
    },
  },
  {
    outKey: 'single_dim',
    taskId: 'T004',
    sampleId: 'read-001',
    answer: async (page) => setRangeValue(page.getByTestId('ws-single-dim-slider'), '4'),
  },
  {
    outKey: 'multi_dim',
    taskId: 'T005',
    sampleId: 'mt-001',
    answer: async (page) => {
      await setRangeValue(page.getByTestId('ws-multi-dim-slider-fluency'), '5');
      await setRangeValue(page.getByTestId('ws-multi-dim-slider-adequacy'), '4');
      await setRangeValue(page.getByTestId('ws-multi-dim-slider-coherence'), '5');
    },
  },
  {
    outKey: 'sequence_tagging',
    taskId: 'T006',
    sampleId: 'sequence-tagging-001',
    answer: async (page) => {
      await page.getByTestId('ws-seq-tag-btn-PER').click();
      await page.getByTestId('ws-seq-token').nth(6).click();
    },
  },
  {
    outKey: 'entity_recognition',
    taskId: 'T007',
    sampleId: 'entity-recognition-001',
    // T007's gold_entities is 'output'-role prefill, already populating the
    // answer -- no manual span selection required to reach a submittable
    // state.
    answer: async () => {},
  },
  {
    outKey: 'relation_identification',
    taskId: 'T008',
    sampleId: 'rel-001',
    // T008's triples/relation_types are 'output'-role prefill.
    answer: async () => {},
  },
  {
    outKey: 'free_text',
    taskId: 'T009',
    sampleId: 'sum-001',
    // T009's gold_answer is 'output'-role prefill.
    answer: async () => {},
  },
];

for (const { outKey, taskId, sampleId, answer } of REGISTRY_CASES) {
  test(`reviewer direct correction is available for ${outKey} and review submit throws no page error`, async ({ page }) => {
    const errors = trackPageErrors(page);

    await submitAsAnnotator(page, taskId, sampleId, () => answer(page));

    await page.goto(buildWorkspaceUrl({ task_id: taskId, sample_id: sampleId, role: 'reviewer' }));
    await dismissGuidelineModal(page);

    const row = page.getByTestId('ws-review-row').first();
    await expect(row.getByTestId(`ws-review-correct-${outKey}`)).toBeVisible();

    // Every output type in this loop has exactly one row -- bulk-approve it
    // (covers every annotator row within, including the prepended "current"
    // row seeded from the submission above) so submit validation passes.
    await bulkApproveAllRows(page);
    await page.getByTestId('ws-review-submit-btn').click();

    assertNoPageErrors(errors);
  });
}
