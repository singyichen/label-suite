import { test, expect, type Page } from '@playwright/test';
import {
  assertNoPageErrors,
  buildWorkspaceUrl,
  dismissGuidelineModal,
  setRangeValue,
  skipGuidelineModal,
  trackPageErrors,
} from './_workspace-helpers';

/* Reviewer mode (spec 015 v3.0.0, FR-044; v4.0.0 FR-053 extends it to both
 * run_types): registry-driven -- ALL 8 output types get a row-level
 * direct-correction entry point that reuses the corresponding annotator
 * control, seeded with the REVIEWED annotator's own submitted answer
 * (single-annotator model, no multi-annotator merge; see
 * annotation-workspace-review-card.spec.ts for the cross-run_type card
 * convergence coverage). Also guards against the OLD
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
  test('the row renders the correction control alone, with no stats/consensus chrome', async ({ page }) => {
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
    // Submitting a real annotator answer first, so the row under review is
    // that submission rather than the demo fallback.
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

  test('dry_run drops the type title too (v4.0.0)', async ({ page }) => {
    // v4.0.0: the consensus card that needed a title (its stats box and
    // annotator list carried no type of their own) is gone -- dry_run now
    // renders the same titleless card as official_run (FR-014P, FR-053).
    await page.goto(buildWorkspaceUrl({ task_id: 'T005', sample_id: 'mt-001', role: 'reviewer', run_type: 'dry_run' }));
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-review-row').locator('.content-card-title')).toHaveCount(0);
  });
});

/* The reviewer card seeds the reviewed annotator's own submission, which the
 * prototype only ever has in localStorage -- so a reviewer arriving from the
 * dashboard's 快速審核 in a fresh browser had nothing to review at all, while
 * the list still promised 待審 N 筆. The demo now falls back to the mock
 * REVIEWER_MOCK_ROWS row for that annotator (spec 015 FR-044a); a real
 * submission always wins over it.
 *
 * These cases also guard the shared-state seeding collision: entity and
 * relation answers share ONE engine state (previewEntities / previewTriples)
 * while every other output type keeps its own slot under previewState[outKey],
 * so a seed that clears more than the slice it owns silently wipes an
 * already-seeded sibling. T010's merged span card seeds both span types, and
 * T013 seeds a third card afterwards. v4.0.0 runs one seeding path for both
 * run_types, so the dry_run duplicates of these cases were dropped. */
test.describe('reviewer demo annotator submission', () => {
  test('a span task shows the annotator entities, relations and highlights (T010)', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T010', sample_id: 'med-001', role: 'reviewer', run_type: 'official_run' }));
    await dismissGuidelineModal(page);

    const panel = page.getByTestId('ws-review-correct-span');
    // One annotator, not a merge: the two repeated (text, type) pairs stay as
    // the 11 separate spans that annotator marked.
    await expect(panel.getByTestId('ws-er-entity-item')).toHaveCount(11);
    await expect(panel.getByTestId('ws-ri-triple-item')).toHaveCount(8);
    await expect(panel.locator('.absa-span-highlight')).toHaveCount(11);
  });

  test('a single-type span task shows the annotator entities (T007)', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T007', sample_id: 'entity-recognition-001', role: 'reviewer', run_type: 'official_run' }));
    await dismissGuidelineModal(page);

    const panel = page.getByTestId('ws-review-correct-entity_recognition');
    await expect(panel.getByTestId('ws-er-entity-item')).toHaveCount(7);
    await expect(panel.locator('.absa-span-highlight')).toHaveCount(7);
  });

  test('a later card of another output type is seeded too (T013)', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T013', sample_id: 'absa-001', role: 'reviewer', run_type: 'official_run' }));
    await dismissGuidelineModal(page);

    const panel = page.getByTestId('ws-review-correct-span');
    await expect(panel.getByTestId('ws-er-entity-item')).toHaveCount(4);
    await expect(panel.getByTestId('ws-ri-triple-item')).toHaveCount(3);
    // previewInited is one shared flag: a span seed that sets it must not
    // leave the multi_dim card rendering blank defaults behind it.
    await expect(page.getByTestId('ws-multi-dim-value-valence')).toHaveText('3');
    await expect(page.getByTestId('ws-multi-dim-value-arousal')).toHaveText('6');
  });

  test('a real annotator submission wins over the demo fallback (T001)', async ({ page }) => {
    await submitAsAnnotator(page, 'T001', 'sent-001', async () => {
      await page.getByTestId('ws-single-label-chip-negative').click();
    });
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: 'official_run' }));
    await dismissGuidelineModal(page);

    // The mock annotator answered 'positive' for this sample.
    await expect(page.getByTestId('ws-single-label-chip-negative')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('ws-single-label-chip-positive')).toHaveAttribute('aria-pressed', 'false');
  });
});
