/**
 * FR-040 Block A-5 — 標記員被修改率 (issue #808, RED).
 *
 * spec.md:477-486 defines the numerator as the count of `annotation-015`
 * FR-051 review units where the reviewer's decision actually differs from
 * the annotator's answer on that output_type (FR-052 diff, NOT the retired
 * `REVIEW_UNIT_STATUS.MODIFIED` value), and the denominator as review units
 * with at least one reviewer submission (pending excluded). spec.md:485
 * requires ONE task-level table (rows = annotators, columns = each
 * `output_type`'s rate + a total), placed outside the per-output-type
 * partial loop — never a per-type sub-block (spec.md:331 vs A-3).
 *
 * This block does not exist in the prototype yet, so every assertion below
 * is expected to fail today.
 *
 * Fixture (T001, single_label, dry_run — real submissions written through
 * the exported `markSampleSubmitted` API, not decorative HTML):
 *   - annotator `113450022`: 3 reviewed units (sent-001..003), reviewer
 *     changes 1 of them -> 1/3 (~33%), small-sample (3 < IAA_SMALL_SAMPLE_THRESHOLD=5).
 *   - annotator `kioleemg12`: 5 reviewed units (sent-001..005), reviewer
 *     changes 2 of them -> 2/5 (40%), not small-sample.
 *   - annotator `tony0950127`: submits nothing -> zero reviewed units ->
 *     MUST NOT appear as a row (a 0/0 rate is undefined, not zero).
 *
 * Traceability: specs/dataset/017-dataset-analysis-detail/spec.md
 *   FR-040, AC-3.17, Block A-5 (line 313-315).
 */
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const DETAIL_URL = '/pages/dataset/dataset-analysis-detail.html';
const TASK = 'T001';

type Identity = { annotatorId?: string; reviewerId?: string };
type WorkspaceApi = {
  markSampleSubmitted: (
    taskId: string, role: string, runType: string, sampleId: string,
    payload: unknown, historySummary: string, identity: Identity
  ) => void;
};

async function seedUnit(
  page: Page,
  sampleId: string,
  annotatorId: string,
  annotatorValue: string,
  reviewerValue: string,
): Promise<void> {
  await page.evaluate((a) => {
    const api = (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceApi })
      .LabelSuiteAnnotationWorkspaceData;
    api.markSampleSubmitted(
      'T001', 'annotator', 'dry_run', a.sampleId,
      { previewState: { single_label: { selected: a.annotatorValue } } }, '',
      { annotatorId: a.annotatorId },
    );
    api.markSampleSubmitted(
      'T001', 'reviewer', 'dry_run', a.sampleId,
      {
        previewState: { single_label: { selected: a.reviewerValue } },
        decisions: { single_label: a.reviewerValue === a.annotatorValue ? 'approve' : 'modify' },
      }, '',
      { annotatorId: a.annotatorId, reviewerId: 'reviewer_wang' },
    );
  }, { sampleId, annotatorId, annotatorValue, reviewerValue });
}

async function seedFixture(page: Page): Promise<void> {
  await page.goto(`${DETAIL_URL}?task_id=${TASK}`);
  // annotator 113450022: 3 reviewed units, 1 modified (sent-002)
  await seedUnit(page, 'sent-001', '113450022', 'neutral', 'neutral');
  await seedUnit(page, 'sent-002', '113450022', 'neutral', 'positive');
  await seedUnit(page, 'sent-003', '113450022', 'neutral', 'neutral');
  // annotator kioleemg12: 5 reviewed units, 2 modified (sent-002, sent-004)
  await seedUnit(page, 'sent-001', 'kioleemg12', 'positive', 'positive');
  await seedUnit(page, 'sent-002', 'kioleemg12', 'positive', 'negative');
  await seedUnit(page, 'sent-003', 'kioleemg12', 'positive', 'positive');
  await seedUnit(page, 'sent-004', 'kioleemg12', 'positive', 'negative');
  await seedUnit(page, 'sent-005', 'kioleemg12', 'positive', 'positive');
  // annotator tony0950127: intentionally left untouched (0 reviewed units)
}

test.describe('Dataset detail — Block A-5 標記員被修改率 (issue #808)', () => {
  test('renders one task-level table outside the per-output-type loop, not a per-type sub-block', async ({ page }) => {
    await seedFixture(page);
    await page.goto(`${DETAIL_URL}?task_id=${TASK}&tab=quality`);

    // Exactly one table for the whole task (T001 has a single output_type,
    // so this also guards against accidentally duplicating it per type).
    await expect(page.locator('#annotatorModRateTable')).toHaveCount(1);
    // Must sit outside #qualityPanelMount (the per-output-type partial mount),
    // per spec.md:315 "本區塊置於逐輸出類型子區塊迴圈之外".
    await expect(page.locator('#qualityPanelMount #annotatorModRateTable')).toHaveCount(0);
  });

  test('excludes an annotator with zero reviewed units from the table', async ({ page }) => {
    await seedFixture(page);
    await page.goto(`${DETAIL_URL}?task_id=${TASK}&tab=quality`);

    const rows = page.locator('#annotatorModRateBody tr');
    await expect(rows).toHaveCount(2);
    await expect(page.locator('#annotatorModRateBody')).not.toContainText('tony0950127');
  });

  test('each row shows the real modified_units / reviewed_units per output_type, not a decorative number', async ({ page }) => {
    await seedFixture(page);
    await page.goto(`${DETAIL_URL}?task_id=${TASK}&tab=quality`);

    const rows = page.locator('#annotatorModRateBody tr');
    // Sorted by annotator_id ascending: '113450022' < 'kioleemg12'.
    const rowA = rows.nth(0);
    const rowB = rows.nth(1);
    await expect(rowA).toContainText('113450022');
    await expect(rowA.locator('[data-output-type="single_label"]')).toContainText('1 / 3');
    await expect(rowA.locator('[data-output-type="single_label"]')).toContainText('33%');
    await expect(rowA.locator('.mod-rate-total')).toContainText('1 / 3');

    await expect(rowB).toContainText('kioleemg12');
    await expect(rowB.locator('[data-output-type="single_label"]')).toContainText('2 / 5');
    await expect(rowB.locator('[data-output-type="single_label"]')).toContainText('40%');
    await expect(rowB.locator('.mod-rate-total')).toContainText('2 / 5');
  });

  test('flags the small-sample row (3 reviewed units < IAA_SMALL_SAMPLE_THRESHOLD=5) but keeps it listed', async ({ page }) => {
    await seedFixture(page);
    await page.goto(`${DETAIL_URL}?task_id=${TASK}&tab=quality`);

    const rows = page.locator('#annotatorModRateBody tr');
    await expect(rows.nth(0).locator('.mod-rate-small-sample-badge')).toHaveCount(1);
    await expect(rows.nth(1).locator('.mod-rate-small-sample-badge')).toHaveCount(0);
  });
});
