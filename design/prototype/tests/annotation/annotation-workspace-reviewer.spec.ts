import { test, expect, type Page } from '@playwright/test';
import {
  assertNoPageErrors,
  buildWorkspaceUrl,
  dismissGuidelineModal,
  setRangeValue,
  skipGuidelineModal,
  trackPageErrors,
} from './_workspace-helpers';

/* official_run reviewer mode (spec 015 v3.0.0, FR-044): registry-driven --
 * ALL 8 output types get a row-level direct-correction entry point that
 * reuses the corresponding annotator control, seeded with the CURRENT
 * annotator's own submitted answer (single-annotator model, no mock
 * multi-annotator comparison; see annotation-workspace-review-card.spec.ts
 * for the dry_run consensus-merge card). Also guards against the OLD
 * workspace's `summarizeReviewerAspectCorrections` ReferenceError on review
 * submit (annotation-workspace.html:5029) recurring in the rewrite.
 *
 * Each output-type row carries exactly one approve/reject decision pair
 * (ws-review-row-approve/ws-review-row-reject, via buildRowDecisionButtons),
 * docked on the correction panel's Bypass row (FR-014P) -- ws-review-submit-btn
 * requires every row to carry a decision before it will submit.
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

/* Approves every ws-review-row's decision directly (official_run
 * has exactly one decision per output-type row, no per-annotator drilling),
 * so ws-review-submit-btn's "every row must carry a decision" validation
 * passes. */
async function approveAllRows(page: Page) {
  const rows = page.getByTestId('ws-review-row');
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    await rows.nth(i).getByTestId('ws-review-row-approve').click();
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
    await expect(row.getByTestId('ws-review-stats')).toHaveCount(0);
    await expect(row.getByTestId('ws-review-annotator-list')).toHaveCount(0);
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
    await approveAllRows(page);
    await page.getByTestId('ws-review-submit-btn').click();

    const history = page.getByTestId('ws-review-history');
    await expect(history).toBeVisible();
    const historyText = (await history.textContent()) || '';
    expect(historyText.trim().length).toBeGreaterThan(0);
    assertNoPageErrors(errors);
  });

  test('submit is blocked until every row carries a decision', async ({ page }) => {
    await submitAsAnnotator(page, 'T001', 'sent-001', async () => {
      await page.getByTestId('ws-single-label-chip-negative').click();
    });

    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).not.toHaveText('審查已提交');

    await approveAllRows(page);
    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審查已提交');
  });

  test('rejecting the row reopens the annotator sample', async ({ page }) => {
    await submitAsAnnotator(page, 'T001', 'sent-001', async () => {
      await page.getByTestId('ws-single-label-chip-negative').click();
    });

    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer' }));
    await dismissGuidelineModal(page);

    const row = page.getByTestId('ws-review-row').first();
    await row.getByTestId('ws-review-row-reject').click();
    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審查已提交');

    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator' }));
    await dismissGuidelineModal(page);
    await expect(page.getByTestId('ws-single-label-chip-negative')).toHaveAttribute('aria-pressed', 'true');
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
    await expect(row.getByTestId('ws-review-row-approve')).toBeVisible();
    await expect(row.getByTestId('ws-review-row-reject')).toBeVisible();

    // Every output type in this loop has exactly one row -- approve it so
    // submit validation passes.
    await approveAllRows(page);
    await page.getByTestId('ws-review-submit-btn').click();

    assertNoPageErrors(errors);
  });
}

test.describe('official_run reviewer with no prior annotator submission', () => {
  test('the row still renders with an empty correction control and no stats/consensus chrome', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-002', role: 'reviewer' }));
    await dismissGuidelineModal(page);

    const row = page.getByTestId('ws-review-row').first();
    await expect(row).toHaveCount(1);
    await expect(row.getByTestId('ws-review-stats')).toHaveCount(0);
    await expect(row.getByTestId('ws-review-gold-status')).toHaveCount(0);
    await expect(row.getByTestId('ws-review-annotator-list')).toHaveCount(0);
    await expect(row.getByTestId('ws-review-correct-single_label')).toBeVisible();
  });
});

/* official_run card chrome (spec 015 v3.4.0, FR-014P): the output-type title
 * row is gone -- the correction panel below it already shows what is being
 * reviewed -- and the approve/reject pair moved down onto the panel's own
 * Bypass row, so every card ends with one decision line
 * (無法判定 … ✕ ✓) regardless of output type. Covers all 8 registry types
 * plus both merged span tasks. */
const CHROME_CASES: Array<{ taskId: string; sampleId: string; outKeys: string[] }> = [
  { taskId: 'T001', sampleId: 'sent-001', outKeys: ['single_label'] },
  { taskId: 'T002', sampleId: 'emo-001', outKeys: ['multi_label'] },
  { taskId: 'T003', sampleId: 'taxonomy-001', outKeys: ['multi_label'] },
  { taskId: 'T004', sampleId: 'read-001', outKeys: ['single_dim'] },
  { taskId: 'T005', sampleId: 'mt-001', outKeys: ['multi_dim'] },
  { taskId: 'T006', sampleId: 'sequence-tagging-001', outKeys: ['sequence_tagging'] },
  { taskId: 'T007', sampleId: 'entity-recognition-001', outKeys: ['entity_recognition'] },
  { taskId: 'T008', sampleId: 'rel-001', outKeys: ['relation_identification'] },
  { taskId: 'T009', sampleId: 'sum-001', outKeys: ['free_text'] },
  { taskId: 'T010', sampleId: 'med-001', outKeys: ['entity_recognition', 'relation_identification'] },
  { taskId: 'T011', sampleId: '00183', outKeys: ['single_label'] },
  { taskId: 'T012', sampleId: 'eac8d013', outKeys: ['free_text'] },
  { taskId: 'T013', sampleId: 'absa-001', outKeys: ['entity_recognition', 'relation_identification', 'multi_dim'] },
];

test.describe('official_run review card chrome', () => {
  for (const { taskId, sampleId, outKeys } of CHROME_CASES) {
    test(`${taskId} (${outKeys.join('+')}) drops the type title and docks decisions on the Bypass row`, async ({ page }) => {
      await page.goto(buildWorkspaceUrl({ task_id: taskId, sample_id: sampleId, role: 'reviewer', run_type: 'official_run' }));
      await dismissGuidelineModal(page);

      const rows = page.getByTestId('ws-review-row');
      await expect(rows.first()).toBeVisible();
      await expect(rows.locator('.content-card-title')).toHaveCount(0);

      // One decision pair per output type, every one of them sitting on a
      // Bypass row rather than floating in a header.
      await expect(page.getByTestId('ws-review-row-approve')).toHaveCount(outKeys.length);
      await expect(page.locator('.preview-bypass-row').getByTestId('ws-review-row-approve'))
        .toHaveCount(outKeys.length);
      await expect(page.locator('.preview-bypass-row').getByTestId('ws-review-row-reject'))
        .toHaveCount(outKeys.length);
    });
  }

  test('toggling Bypass re-renders the panel without losing the decision buttons', async ({ page }) => {
    // The engine rebuilds the whole preview container on a Bypass toggle, so
    // the docked decision pair has to survive that re-render.
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: 'official_run' }));
    await dismissGuidelineModal(page);

    const bypassChip = page.locator('.preview-bypass-row button[aria-pressed]').first();
    await bypassChip.click();
    await expect(page.locator('.preview-bypass-row').getByTestId('ws-review-row-approve')).toHaveCount(1);

    await page.locator('.preview-bypass-row button[aria-pressed]').first().click();
    await expect(page.locator('.preview-bypass-row').getByTestId('ws-review-row-approve')).toHaveCount(1);
  });

  test('a docked decision still drives submit validation', async ({ page }) => {
    // Validation only has a row to check once an annotator has submitted:
    // getReviewerRows returns [] otherwise, and submit passes vacuously.
    await submitAsAnnotator(page, 'T001', 'sent-001', async () => {
      await page.getByTestId('ws-single-label-chip-negative').click();
    });
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: 'official_run' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).not.toHaveText('審查已提交');

    await page.locator('.preview-bypass-row').getByTestId('ws-review-row-approve').click();
    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審查已提交');
  });

  test('dry_run keeps its output-type titles', async ({ page }) => {
    // The consensus card still needs a title: its stats box and annotator
    // list carry no type of their own.
    await page.goto(buildWorkspaceUrl({ task_id: 'T005', sample_id: 'mt-001', role: 'reviewer', run_type: 'dry_run' }));
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-review-row').locator('.content-card-title')).toHaveCount(1);
  });
});
