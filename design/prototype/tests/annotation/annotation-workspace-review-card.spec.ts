import { test, expect, type Page } from '@playwright/test';
import {
  assertNoPageErrors,
  buildWorkspaceUrl,
  dismissGuidelineModal,
  patchDataFile,
  skipGuidelineModal,
  trackPageErrors,
} from './_workspace-helpers';

/* Reviewer workspace review card (spec 015 v4.0.0, FR-030~FR-042, BREAKING):
 * the review unit is sample × annotator for BOTH run types, so the dry_run
 * consensus-merge + gold-adjudication card introduced in v3.0.0 is gone. Per
 * output type, one `ws-review-row` shows:
 *   1. header
 *   2. the FR-024L direct-correction control, seeded from the reviewed
 *      annotator's own answer
 *   3. one `ws-review-row-approve` / `ws-review-row-reject` pair
 * No distribution stats, no consensus badge, no apply-majority button, no
 * multi-annotator list, and no sample-level `ws-review-gold-status` card
 * (removed in v3.1.0 as redundant with the sample list and history panel).
 *
 * Mock data: getReviewerMockRows(taskId, sampleId) still ships 3 annotators
 * per sample, but a card reads exactly one of them -- the annotator named by
 * `annotator_id`, defaulting to the group's first (kioleemg12).
 */

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

async function gotoT001Reviewer(page: Page) {
  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: 'dry_run' }));
  await dismissGuidelineModal(page);
}

test.describe('Sample-level gold status badge (removed v3.1.0)', () => {
  test('no gold status badge card renders, before or after a dry_run submit', async ({ page }) => {
    await gotoT001Reviewer(page);

    await expect(page.getByTestId('ws-review-gold-status')).toHaveCount(0);

    await page.getByTestId('ws-review-row-approve').click();
    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審查已提交');
    await expect(page.getByTestId('ws-review-gold-status')).toHaveCount(0);
  });
});

/* THE 13-TASK COVERAGE LOOP -- every seed TaskProfile, once. */
const TASK_COVERAGE: Array<{ taskId: string; sampleId: string; outKeys: string[] }> = [
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

/* v3.3.0 FR-014N: entity_recognition and relation_identification share one
 * engine preview, so a task shipping both collapses them into ONE review
 * card ("review unit") holding one correction panel but a decision pair per
 * output type. Every other output type stays one unit per key. */
const SPAN_KEYS = ['entity_recognition', 'relation_identification'];

function reviewUnits(outKeys: string[]): string[][] {
  const spanKeys = outKeys.filter((key) => SPAN_KEYS.includes(key));
  const merged = spanKeys.length === SPAN_KEYS.length;
  const units: string[][] = [];
  for (const key of outKeys) {
    if (merged && SPAN_KEYS.includes(key)) {
      if (key === spanKeys[0]) units.push(spanKeys);
      continue;
    }
    units.push([key]);
  }
  return units;
}

function correctionTestId(unit: string[]): string {
  return unit.length > 1 ? 'ws-review-correct-span' : `ws-review-correct-${unit[0]}`;
}

for (const { taskId, sampleId, outKeys } of TASK_COVERAGE) {
  for (const runType of ['dry_run', 'official_run'] as const) {
    test(`reviewer card renders for ${taskId} (${outKeys.join('+')}) in ${runType}`, async ({ page }) => {
      const errors = trackPageErrors(page);

      await page.goto(buildWorkspaceUrl({ task_id: taskId, sample_id: sampleId, role: 'reviewer', run_type: runType }));
      await dismissGuidelineModal(page);

      const units = reviewUnits(outKeys);
      const rows = page.getByTestId('ws-review-row');
      await expect(rows).toHaveCount(units.length);

      for (let i = 0; i < units.length; i++) {
        const unit = units[i];
        const row = rows.nth(i);

        // Exactly one correction panel per card...
        await expect(row.getByTestId(correctionTestId(unit))).toHaveCount(1);
        await expect(row.getByTestId(correctionTestId(unit))).toBeVisible();
        // ...but one decision pair per output type inside it.
        await expect(row.getByTestId('ws-review-row-approve')).toHaveCount(unit.length);
        await expect(row.getByTestId('ws-review-row-reject')).toHaveCount(unit.length);
      }

      assertNoPageErrors(errors);
    });
  }
}

/* v3.3.0 FR-014N — the raw sample text used to be painted up to three times
 * on one reviewer screen (the 原始文本 card, the entity_recognition
 * correction panel and the relation_identification correction panel), all
 * three visually identical, so nothing signalled which copy was the
 * interactive one. Span output types sharing one card is what cuts that
 * down; the 原始文本 card itself is gone in v4.0.0. */
test.describe('Span output types share one review card', () => {
  test('T010 (entity+relation) renders one card with a single correction panel', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T010', sample_id: 'med-001', role: 'reviewer', run_type: 'dry_run' }));
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-review-row')).toHaveCount(1);
    await expect(page.getByTestId('ws-review-correct-span')).toHaveCount(1);
    await expect(page.getByTestId('ws-review-correct-entity_recognition')).toHaveCount(0);
    await expect(page.getByTestId('ws-review-correct-relation_identification')).toHaveCount(0);
  });

  test('each decision pair on the merged card is labeled with its output type', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T010', sample_id: 'med-001', role: 'reviewer', run_type: 'dry_run' }));
    await dismissGuidelineModal(page);

    const labels = page.getByTestId('ws-review-section-label');
    await expect(labels).toHaveCount(2);
    await expect(labels.nth(0)).toHaveText('entity_recognition');
    await expect(labels.nth(1)).toHaveText('relation_identification');
  });

  test('T013 keeps multi_dim as its own card next to the merged span card', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T013', sample_id: 'absa-001', role: 'reviewer', run_type: 'dry_run' }));
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-review-row')).toHaveCount(2);
    await expect(page.getByTestId('ws-review-correct-span')).toHaveCount(1);
    await expect(page.getByTestId('ws-review-correct-multi_dim')).toHaveCount(1);
  });

  test('single-span tasks are untouched — T007 and T008 still render their own correction panel', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T007', sample_id: 'entity-recognition-001', role: 'reviewer', run_type: 'dry_run' }));
    await dismissGuidelineModal(page);
    await expect(page.getByTestId('ws-review-correct-entity_recognition')).toHaveCount(1);
    await expect(page.getByTestId('ws-review-correct-span')).toHaveCount(0);

    await page.goto(buildWorkspaceUrl({ task_id: 'T008', sample_id: 'rel-001', role: 'reviewer', run_type: 'dry_run' }));
    await dismissGuidelineModal(page);
    await expect(page.getByTestId('ws-review-correct-relation_identification')).toHaveCount(1);
    await expect(page.getByTestId('ws-review-correct-span')).toHaveCount(0);
  });

  test('official_run paints the sample text exactly once', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T013', sample_id: 'absa-001', role: 'reviewer', run_type: 'official_run' }));
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-review-source-text')).toHaveCount(0);
    await expect(page.locator('.absa-preview-text')).toHaveCount(1);
  });
});

test.describe('Regression guard: no page errors on the reviewer flow', () => {
  test('full dry_run correct-and-submit round trip throws no page error', async ({ page }) => {
    const errors = trackPageErrors(page);

    // T001's gold_label is an output-role prefill that would otherwise leave
    // the sample already-answered before the reviewer even opens it.
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T001.datasetRecords[0].gold_label = null;
    `);

    await gotoT001Reviewer(page);
    await page.getByTestId('ws-review-correct-single_label')
      .getByTestId('ws-single-label-chip-neutral').click();
    await page.getByTestId('ws-review-row-reject').click();
    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toast')).toBeVisible();

    await page.getByTestId('ws-guideline-tab-history').click();
    await expect(page.getByTestId('ws-history-panel')).toContainText('single_label');

    assertNoPageErrors(errors);
  });
});

/* ── spec 015 v4.0.0 (issue #146 P2a, BREAKING) ──────────────────────────
 * The review unit is now sample × annotator for BOTH run types, so the
 * dry_run consensus/gold adjudication card is gone: no distribution stats,
 * no consensus badge, no apply-majority, no multi-annotator list. Both run
 * types render the SAME single-annotator card the official_run path already
 * shipped -- the reviewed annotator's own answer seeded into the correction
 * panel, closing on one approve/reject pair.
 */
test.describe('Review card converged across run types (v4.0.0)', () => {
  const CONSENSUS_TESTIDS = [
    'ws-review-stats',
    'ws-review-consensus-badge',
    'ws-review-apply-majority',
    'ws-review-annotator-list',
  ] as const;

  test('dry_run drops every consensus-model element', async ({ page }) => {
    await gotoT001Reviewer(page);

    await expect(page.getByTestId('ws-review-row')).toHaveCount(1);
    for (const testId of CONSENSUS_TESTIDS) {
      await expect(page.getByTestId(testId)).toHaveCount(0);
    }
  });

  test('dry_run closes the card on one approve/reject pair, like official_run', async ({ page }) => {
    await gotoT001Reviewer(page);

    await expect(page.getByTestId('ws-review-row-approve')).toHaveCount(1);
    await expect(page.getByTestId('ws-review-row-reject')).toHaveCount(1);
  });

  /* The discriminator: on sent-001 the majority pick is `positive` (2/3) but
   * annotator 113450022 answered `negative`. Seeding `negative` proves the
   * card reviews ONE annotator rather than a merged consensus. */
  test('dry_run seeds the reviewed annotator answer, not the majority pick', async ({ page }) => {
    // T001's gold_label is an output-role dataset prefill that outranks the
    // review seed, so it would mask which annotator the card actually read.
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T001.datasetRecords[0].gold_label = null;
    `);
    await page.goto(buildWorkspaceUrl({
      task_id: 'T001', sample_id: 'sent-001', role: 'reviewer',
      run_type: 'dry_run', annotator_id: '113450022',
    }));
    await dismissGuidelineModal(page);

    const correction = page.getByTestId('ws-review-correct-single_label');
    await expect(correction.getByTestId('ws-single-label-chip-negative')).toHaveAttribute('aria-pressed', 'true');
    await expect(correction.getByTestId('ws-single-label-chip-positive')).toHaveAttribute('aria-pressed', 'false');
  });

  test('dry_run submit is blocked until the row carries a decision', async ({ page }) => {
    await gotoT001Reviewer(page);

    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).not.toHaveText('審查已提交');

    await page.getByTestId('ws-review-row-approve').click();
    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審查已提交');
  });

  /* The 原始文本 card only ever earned its place by showing the UNION across
   * annotators (FR-014O). With one annotator per card, the correction panel
   * already paints those exact spans, so the card is a pixel-identical
   * duplicate for dry_run too. */
  test('dry_run drops the 原始文本 card and paints the sample text exactly once', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T013', sample_id: 'absa-001', role: 'reviewer', run_type: 'dry_run' }));
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-review-source-text')).toHaveCount(0);
    await expect(page.locator('.absa-preview-text')).toHaveCount(1);
  });

  test('merged span card carries one decision pair per output type in dry_run', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T010', sample_id: 'med-001', role: 'reviewer', run_type: 'dry_run' }));
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-review-row')).toHaveCount(1);
    await expect(page.getByTestId('ws-review-row-approve')).toHaveCount(2);
    await expect(page.getByTestId('ws-review-row-reject')).toHaveCount(2);
    await expect(page.getByTestId('ws-review-correct-span')).toHaveCount(1);
  });
});
