import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

type TaskCase = {
  taskId: string;
  riskTableLabel: string;
  groupAvgId: string;
  expectedGroupAvg: string;
  expectedHeaders: string[];
  expectedRiskLevels: string[];
  expectedActions: string[];
  expectedCauseTexts: string[];
  expectedConsistencyUnit: string;
};

const TASK_CASES: TaskCase[] = [
  {
    taskId: 'T102',
    riskTableLabel: 'Annotator analysis (VA scoring)',
    groupAvgId: 'vaGroupAvg',
    expectedGroupAvg: 'Group avg — IAA_V: 0.78 / IAA_A: 0.82 / Avg speed: 32.7s/sent',
    expectedHeaders: ['Annotator', 'Avg Speed', 'IAA_V', 'IAA_A', 'Risk Level', 'Cause', 'Sample Count', 'Recommended Action'],
    expectedRiskLevels: ['Normal', 'Watch', 'High Risk'],
    expectedActions: ['Review annotations', 'Review annotations', 'Review annotations', 'Adjust participation'],
    expectedCauseTexts: ['No anomaly cause', 'V Systematically high', 'A Too slow', 'V Systematically low', 'A Too fast'],
    expectedConsistencyUnit: 'Comparable Sentences',
  },
  {
    taskId: 'T106',
    riskTableLabel: 'Annotator analysis (sequence labeling)',
    groupAvgId: 'seqGroupAvg',
    expectedGroupAvg: 'Group avg — F1 (strict): 0.72 / Avg speed: 44.7s/sent',
    expectedHeaders: ['Annotator', 'Avg Speed', 'F1 (strict)', 'Risk Level', 'Cause', 'Sample Count', 'Recommended Action'],
    expectedRiskLevels: ['Normal', 'Watch', 'High Risk'],
    expectedActions: ['Review annotations', 'Review annotations', 'Review annotations', 'Adjust participation'],
    expectedCauseTexts: ['No anomaly cause', 'Systematic bias', 'Too fast', 'Systematic bias'],
    expectedConsistencyUnit: 'Comparable Spans',
  },
  {
    taskId: 'T104',
    riskTableLabel: 'Annotator analysis (relation extraction)',
    groupAvgId: 'relGroupAvg',
    expectedGroupAvg: 'Group avg — Triple F1: 0.76 / Avg speed: 54.0s/sent',
    expectedHeaders: ['Annotator', 'Avg Speed', 'Triple F1', 'Risk Level', 'Cause', 'Sample Count', 'Recommended Action'],
    expectedRiskLevels: ['Normal', 'Watch', 'High Risk'],
    expectedActions: ['Review annotations', 'Review annotations', 'Review annotations', 'Adjust participation'],
    expectedCauseTexts: ['No anomaly cause', 'Too slow', 'Too fast', 'Systematic bias'],
    expectedConsistencyUnit: 'Triples Annotated 5 Times',
  },
  {
    taskId: 'T105',
    riskTableLabel: 'Classification annotator risk assessment',
    groupAvgId: 'singleLabelGroupAvg',
    expectedGroupAvg: 'Group avg — Alpha: 0.85 / Avg speed: 31.3s/sent',
    expectedHeaders: ['Annotator', 'Avg Speed', 'Alpha', 'Risk Level', 'Cause', 'Sample Count', 'Recommended Action'],
    expectedRiskLevels: ['Normal', 'Normal', 'Normal'],
    expectedActions: ['Review annotations', 'Review annotations', 'Review annotations'],
    expectedCauseTexts: ['No anomaly cause', 'No anomaly cause', 'No anomaly cause'],
    expectedConsistencyUnit: 'Comparable Samples',
  },
];

async function gotoEnglishQuality(page: Page, taskId: string) {
  await page.addInitScript(() => {
    window.localStorage.setItem('labelsuite.lang', 'en');
  });

  await page.goto(`/pages/dataset/dataset-analysis-detail.html?task_id=${taskId}&tab=quality`);
}

test.describe('Dataset analysis detail quality i18n across task types', () => {
  test('renders dataset detail sidebar user role in English mode', async ({ page }) => {
    await gotoEnglishQuality(page, 'T102');

    await expect(page.locator('#userName')).toHaveText('Mandy Chen');
    await expect(page.locator('#roleIndicator')).toHaveText('User');
    await expect(page.locator('#roleIndicator')).not.toHaveText('一般使用者');
  });

  for (const taskCase of TASK_CASES) {
    test(`renders ${taskCase.taskId} quality table in English without mixed Chinese`, async ({ page }) => {
      await gotoEnglishQuality(page, taskCase.taskId);

      const riskTable = page.locator(`table[aria-label="${taskCase.riskTableLabel}"]`);
      await expect(riskTable.locator('thead th')).toHaveText(taskCase.expectedHeaders);
      await expect(riskTable.locator('[data-risk-level]')).toHaveText(taskCase.expectedRiskLevels);
      await expect(riskTable.locator('[data-role-action]')).toHaveText(taskCase.expectedActions);
      await expect(riskTable.locator('.cause-muted, .cause-chip, .cause-line')).toHaveText(taskCase.expectedCauseTexts);
      await expect(page.locator(`#${taskCase.groupAvgId}`)).toHaveText(taskCase.expectedGroupAvg);
      await expect(page.locator('#consistencyUnitCol')).toHaveText(taskCase.expectedConsistencyUnit);
      await expect(riskTable).not.toContainText(/[標記員平均速度風險等級異常原因樣本數建議行動審核調整正常觀察高風險資料不足系統性偏差標記過快標記過慢無異常原因]/);
    });
  }
});
