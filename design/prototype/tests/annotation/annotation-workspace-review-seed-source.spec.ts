import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, patchDataFile, skipGuidelineModal } from './_workspace-helpers';

/* Reviewer seed source (issue #161, spec 015 AC-3.35).
 *
 * AC-3.35 requires the review panel to be seeded from the REVIEWED
 * ANNOTATOR's own answer -- FR-044a's precedence has no dataset-column term
 * at all. But the engine's per-type renderers default-merge from
 * getOutputFieldValue(outKey), i.e. the dataset's output-role column, so any
 * type whose annotator answer was absent (or whose slot the reviewer seed
 * deleted) silently fell back to the creator's gold value. On T001/sent-001
 * annotator `113450022` submitted `negative` while `gold_label` is
 * `positive`, and the review panel showed positive -- the reviewer would
 * approve an answer nobody gave, and FR-051/FR-052's review-unit status is
 * computed off that same wrong comparison.
 *
 * The invariant asserted here is deliberately value-free, so it holds for
 * all 8 OUTPUT_TYPE_KEYS without hardcoding a single gold value
 * (Constitution: Generalization-First): stripping every output-role column
 * from the dataset MUST NOT change one pixel of the reviewer's panel. If it
 * does, the panel was reading that column.
 *
 * The mirror case is 013 FR-003g-5, which deliberately DOES prefill the
 * ANNOTATOR's input UI from output-role columns as pre-annotation
 * scaffolding. That is not the defect and must survive this fix, so the
 * second describe below pins it.
 */

/* Deletes every column the profile itself declares 'output', for every task.
 * Keyed purely off fieldRoleMap -- never off task_id or column name. */
const STRIP_OUTPUT_COLUMNS = `
  var profiles = (window.LabelSuiteTaskDetailData && window.LabelSuiteTaskDetailData.profiles) || {};
  Object.keys(profiles).forEach(function (taskId) {
    var profile = profiles[taskId];
    var roles = profile.fieldRoleMap || {};
    var outputCols = Object.keys(roles).filter(function (col) { return roles[col] === 'output'; });
    (profile.datasetRecords || []).forEach(function (record) {
      outputCols.forEach(function (col) { delete record[col]; });
    });
  });
`;

/* innerText alone would miss every seeded value that lives in DOM state
 * rather than text: which chip is pressed, where a slider sits, what a
 * textarea holds. Capture all three. */
function serializePanels(page: Page, testId: string) {
  return page.getByTestId(testId).evaluateAll((rows) =>
    rows.map((row) => {
      const parts = [(row as HTMLElement).innerText.replace(/\s+/g, ' ').trim()];
      row.querySelectorAll('[aria-pressed]').forEach((node) => {
        parts.push(`pressed:${(node.textContent || '').trim()}=${node.getAttribute('aria-pressed')}`);
      });
      row.querySelectorAll('input,textarea,select').forEach((node) => {
        const field = node as HTMLInputElement;
        const id = field.name || field.getAttribute('data-testid') || field.className;
        const value = field.type === 'checkbox' || field.type === 'radio' ? String(field.checked) : field.value;
        parts.push(`field:${field.type || field.tagName}:${id}=${value}`);
      });
      return parts.join(' § ');
    })
  );
}

async function panelsAfterLoad(page: Page, url: string, testId: string, strip: boolean) {
  if (strip) await patchDataFile(page, 'task-detail.data.js', STRIP_OUTPUT_COLUMNS);
  await page.goto(url);
  await dismissGuidelineModal(page);
  await expect(page.getByTestId(testId).first()).toBeVisible();
  return serializePanels(page, testId);
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

/* Every seed TaskProfile, with an annotator picked (where the seeds differ)
 * to disagree with the gold column, so a leak is observable rather than
 * masked by coincidental agreement. */
const TASK_COVERAGE: Array<{ taskId: string; sampleId: string; annotatorId: string }> = [
  { taskId: 'T001', sampleId: 'sent-001', annotatorId: '113450022' },
  { taskId: 'T002', sampleId: 'emo-001', annotatorId: 'tony0950127' },
  { taskId: 'T003', sampleId: 'taxonomy-001', annotatorId: 'tony0950127' },
  { taskId: 'T004', sampleId: 'read-001', annotatorId: 'tony0950127' },
  { taskId: 'T005', sampleId: 'mt-002', annotatorId: 'tony0950127' },
  { taskId: 'T006', sampleId: 'sequence-tagging-001', annotatorId: 'tony0950127' },
  { taskId: 'T007', sampleId: 'entity-recognition-001', annotatorId: 'tony0950127' },
  { taskId: 'T008', sampleId: 'rel-001', annotatorId: 'tony0950127' },
  { taskId: 'T009', sampleId: 'sum-001', annotatorId: 'tony0950127' },
  { taskId: 'T010', sampleId: 'med-001', annotatorId: 'tony0950127' },
  { taskId: 'T011', sampleId: '00183', annotatorId: 'tony0950127' },
  { taskId: 'T012', sampleId: 'eac8d013', annotatorId: 'tony0950127' },
  { taskId: 'T013', sampleId: 'absa-001', annotatorId: 'tony0950127' },
];

test.describe('Reviewer panel ignores dataset output-role columns (AC-3.35)', () => {
  for (const runType of ['dry_run', 'official_run'] as const) {
    for (const { taskId, sampleId, annotatorId } of TASK_COVERAGE) {
      test(`${taskId} ${runType}: stripping gold columns leaves the review panel unchanged`, async ({
        page,
      }) => {
        /* Two full workspace loads per case -- twice the usual budget, which
         * overran the 30s default once under a fully loaded serial run. */
        test.slow();
        const url = buildWorkspaceUrl({
          task_id: taskId,
          sample_id: sampleId,
          role: 'reviewer',
          run_type: runType,
          annotator_id: annotatorId,
        });
        const withGold = await panelsAfterLoad(page, url, 'ws-review-row', false);
        expect(withGold.length).toBeGreaterThan(0);
        const withoutGold = await panelsAfterLoad(page, url, 'ws-review-row', true);
        expect(withoutGold).toEqual(withGold);
      });
    }
  }

  /* The concrete case from issue #161, spelled out so the regression stays
   * readable even if the invariant above is ever refactored. */
  test('T001 shows the reviewed annotator answer, not gold_label', async ({ page }) => {
    await page.goto(
      buildWorkspaceUrl({
        task_id: 'T001',
        sample_id: 'sent-001',
        role: 'reviewer',
        run_type: 'official_run',
        annotator_id: '113450022',
      })
    );
    await dismissGuidelineModal(page);
    const chips = page.getByTestId('ws-review-correct-single_label').locator('[aria-pressed]');
    await expect(chips.filter({ hasText: 'negative' })).toHaveAttribute('aria-pressed', 'true');
    await expect(chips.filter({ hasText: 'positive' })).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('Annotator prefill from output-role columns survives (013 FR-003g-5)', () => {
  test('T001 preselects the gold_label chip for the annotator', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator' }));
    await dismissGuidelineModal(page);
    const chips = page.getByTestId('ws-output-panel-single_label').locator('[aria-pressed]');
    await expect(chips.filter({ hasText: 'positive' })).toHaveAttribute('aria-pressed', 'true');
  });

  /* Contrapositive, so the guard above cannot pass by accident on a panel
   * that renders nothing: removing the column must visibly change it. */
  test('T001 annotator panel changes once the gold column is gone', async ({ page }) => {
    test.slow();
    const url = buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator' });
    const withGold = await panelsAfterLoad(page, url, 'ws-output-panel-single_label', false);
    const withoutGold = await panelsAfterLoad(page, url, 'ws-output-panel-single_label', true);
    expect(withoutGold).not.toEqual(withGold);
  });
});
