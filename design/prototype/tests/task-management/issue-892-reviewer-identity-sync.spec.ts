/*
 * Issue #892: task-detail review history and its reviewer filter must use the
 * same submitted-review ownership as the annotation list (014 FR-015a-1,
 * 015 FR-093). The old REVIEW_FLOW_UNITS copy assigns all T016 rows to wang.
 * These are hand-checked public demo outcomes, not expectations computed by
 * the task-detail builder under test.
 */
import { test, expect, type Page } from '@playwright/test';
import { buildListUrl, patchDataFile } from '../annotation/_workspace-helpers';

const DETAIL_URL = '/pages/task-management/task-detail.html?task_id=T016&tab=annotation-results';
const SAMPLES = [
  { id: 'ofm-01-reviewer-corrects-b', reviewer: '王小明', arbitrated: true },
  { id: 'ofm-02-reviewer-accepts-a', reviewer: '李大華', arbitrated: false },
  { id: 'ofm-03-awaiting-arbitration', reviewer: '林佳蓉', arbitrated: false },
  { id: 'ofm-04-reviewer-bypass', reviewer: '王小明', arbitrated: false },
  { id: 'ofm-05-final-exception', reviewer: '李大華', arbitrated: true },
] as const;

const REVIEWERS = [
  { id: 'reviewer_wang', name: '王小明', samples: ['ofm-01-reviewer-corrects-b', 'ofm-04-reviewer-bypass'] },
  { id: 'reviewer_li', name: '李大華', samples: ['ofm-02-reviewer-accepts-a', 'ofm-05-final-exception'] },
  { id: 'reviewer_lin', name: '林佳蓉', samples: ['ofm-03-awaiting-arbitration'] },
] as const;

async function openDetail(page: Page): Promise<void> {
  const response = await page.goto(DETAIL_URL);
  expect(response?.status()).toBe(200);
  await expect(page.locator('#arTableSection')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#arResultTableBody tr.ar-summary-row')).toHaveCount(5);
}

async function visibleDetailSamples(page: Page): Promise<string[]> {
  return page.locator('#arResultTableBody tr.ar-summary-row .ar-id-cell').allTextContents();
}

for (const sample of SAMPLES) {
  test(`T016 ${sample.id} shows its submitted reviewer and separate arbiter`, async ({ page }) => {
    await openDetail(page);

    const summary = page.locator('#arResultTableBody tr.ar-summary-row').filter({ hasText: sample.id });
    await expect(summary).toHaveCount(1);
    await summary.locator('.ar-expand-btn').click();
    const detail = summary.locator('xpath=following-sibling::tr[1]');
    await expect(detail).toHaveClass(/annotator-detail-row/);

    // The review owner comes from that unit's submitted review, not the
    // task-level roster or the arbitration vote.
    await expect(detail.locator('.ar-history-review .ar-history-name')).toHaveText(sample.reviewer);
    await expect(detail.locator('.ar-history-review')).toHaveCount(1);
    if (sample.arbitrated) {
      await expect(detail.locator('.ar-history-arbitration .ar-history-name')).toHaveText('陳美玲');
    } else {
      await expect(detail.locator('.ar-history-arbitration')).toHaveCount(0);
    }
  });
}

for (const reviewer of REVIEWERS) {
  test(`T016 ${reviewer.id} filter agrees with reviewer-scoped annotation list`, async ({ page }) => {
    const listResponse = await page.goto(buildListUrl({
      task_id: 'T016', role: 'reviewer', run_type: 'official_run', reviewer_id: reviewer.id,
    }));
    expect(listResponse?.status()).toBe(200);
    const listIds = await page.getByTestId('ws-sample-item').getByTestId('list-review-id').allTextContents();
    expect(listIds.sort()).toEqual([...reviewer.samples].sort());

    await openDetail(page);
    const filter = page.locator('#arReviewerSelect');
    expect(await filter.locator('option').allTextContents()).toContain(reviewer.name);
    await filter.selectOption({ label: reviewer.name });
    expect((await visibleDetailSamples(page)).sort()).toEqual([...reviewer.samples].sort());
    expect((await visibleDetailSamples(page)).sort()).toEqual(listIds.sort());
  });
}

test('T016 arbiter filter includes both arbitration votes without making chen a review owner', async ({ page }) => {
  await openDetail(page);
  const filter = page.locator('#arReviewerSelect');
  await filter.selectOption({ label: '陳美玲' });
  expect((await visibleDetailSamples(page)).sort()).toEqual([
    'ofm-01-reviewer-corrects-b',
    'ofm-05-final-exception',
  ]);
});

const DECISIONS = [
  { sampleId: 'ofm-01-reviewer-corrects-b', reviewer: '王小明', review: '修改 → negative', arbitration: '採 B（採用審核員修正）' },
  { sampleId: 'ofm-02-reviewer-accepts-a', reviewer: '李大華', review: '同意', arbitration: null },
  { sampleId: 'ofm-03-awaiting-arbitration', reviewer: '林佳蓉', review: '修改 → negative', arbitration: null },
  { sampleId: 'ofm-04-reviewer-bypass', reviewer: '王小明', review: '無法裁決', arbitration: null },
  { sampleId: 'ofm-05-final-exception', reviewer: '李大華', review: '修改 → positive', arbitration: '兩者皆非' },
] as const;

for (const expected of DECISIONS) {
  test(`T016 ${expected.sampleId} history preserves its review and arbitration outcomes`, async ({ page }) => {
    await openDetail(page);
    const summary = page.locator('#arResultTableBody tr.ar-summary-row').filter({ hasText: expected.sampleId });
    await summary.locator('.ar-expand-btn').click();
    const detail = summary.locator('xpath=following-sibling::tr[1]');
    const review = detail.locator('.ar-history-review');
    await expect(review.locator('.ar-history-name')).toHaveText(expected.reviewer);
    await expect(review.locator('.ar-history-decision')).toHaveText(expected.review);
    const arbitration = detail.locator('.ar-history-arbitration');
    if (expected.arbitration) {
      await expect(arbitration.locator('.ar-history-name')).toHaveText('陳美玲');
      await expect(arbitration.locator('.ar-history-decision')).toHaveText(expected.arbitration);
    } else {
      await expect(arbitration).toHaveCount(0);
    }
  });
}

async function openMultiLabelFixture(page: Page): Promise<void> {
  const taskId = 'T892';
  const sampleId = 'synthetic-multi-label-review';
  const annotatorId = 'fixture_annotator';

  await patchDataFile(page, 'task-list.data.js', `
    var task = JSON.parse(JSON.stringify(window.LabelSuiteTaskListData.tasks.find(function (item) { return item.id === 'T002'; })));
    task.id = '${taskId}';
    task.runType = 'official_run';
    window.LabelSuiteTaskListData.tasks.push(task);
  `);
  await patchDataFile(page, 'task-detail.data.js', `
    var profile = JSON.parse(JSON.stringify(window.LabelSuiteTaskDetailData.profiles.T002));
    profile.datasetRecords = [{ id: '${sampleId}', text: 'Synthetic review sample' }];
    profile.reviewerIds = ['reviewer_wang', 'reviewer_chen'];
    profile.arbiterIds = ['reviewer_chen'];
    window.LabelSuiteTaskDetailData.profiles.${taskId} = profile;
  `);
  await patchDataFile(page, 'annotation-workspace.data.js', `
    var data = window.LabelSuiteAnnotationWorkspaceData;
    data.markSampleSubmitted('${taskId}', 'annotator', 'official_run', '${sampleId}',
      { previewState: { multi_label: { selected: ['sad', 'fear'] } } }, '',
      { annotatorId: '${annotatorId}' });
    data.markSampleSubmitted('${taskId}', 'reviewer', 'official_run', '${sampleId}',
      { previewState: { multi_label: { selected: ['sad', 'fear', 'angry'] } },
        decisions: { multi_label: 'modify' }, reasons: { multi_label: 'Synthetic correction' } }, '',
      { annotatorId: '${annotatorId}', reviewerId: 'reviewer_wang' });
    var items = data.getDisputeItems('${taskId}', 'official_run', '${sampleId}',
      { annotatorId: '${annotatorId}' }, ['multi_label']);
    if (items.length !== 1) throw new Error('Expected one multi-label dispute item');
    data.submitArbitration('${taskId}', 'official_run', '${sampleId}',
      { annotatorId: '${annotatorId}', reviewerId: 'reviewer_chen' },
      [{ itemId: items[0].outKey + '::' + items[0].key, choice: 'adopt_b',
        value: items[0].reviewerValues.reviewer_wang, reason: 'Adopt correction' }]);
  `);

  const response = await page.goto(`/pages/task-management/task-detail.html?task_id=${taskId}&tab=annotation-results`);
  expect(response?.status()).toBe(200);
  await expect(page.locator('#arTableSection')).toBeVisible({ timeout: 15000 });
  const summary = page.locator('#arResultTableBody tr.ar-summary-row').filter({ hasText: sampleId });
  await expect(summary).toHaveCount(1);
  await summary.locator('.ar-expand-btn').click();
}

test('config-driven multi-label result shows the submitted annotator answer', async ({ page }) => {
  await openMultiLabelFixture(page);
  const summary = page.locator('#arResultTableBody tr.ar-summary-row').filter({ hasText: 'synthetic-multi-label-review' });
  const detail = summary.locator('xpath=following-sibling::tr[1]');
  await expect(detail.locator('.annotator-result-tag')).toHaveText('sad, fear');
});

test('config-driven multi-label history shows the output decision and arbitration', async ({ page }) => {
  await openMultiLabelFixture(page);
  const summary = page.locator('#arResultTableBody tr.ar-summary-row').filter({ hasText: 'synthetic-multi-label-review' });
  const detail = summary.locator('xpath=following-sibling::tr[1]');
  await expect(detail.locator('.ar-history-review .ar-history-name')).toHaveText('王小明');
  await expect(detail.locator('.ar-history-review .ar-history-decision')).toHaveText('修改 → sad, fear, angry');
  await expect(detail.locator('.ar-history-arbitration .ar-history-name')).toHaveText('陳美玲');
  await expect(detail.locator('.ar-history-arbitration .ar-history-decision')).toHaveText('採 B（採用審核員修正）');
});
