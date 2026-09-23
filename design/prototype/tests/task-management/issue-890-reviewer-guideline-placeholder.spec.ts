/*
 * Traceability: issue #890; annotation-015 FR-070 and FR-092.
 * Reviewer guidance must describe the current three-way decision model.
 */
import { expect, test, type Locator } from '@playwright/test';

const TASK_NEW_URL = '/pages/task-management/task-new.html';
const TASK_DETAIL_URL = '/pages/task-management/task-detail.html?task_role=project_leader&task_id=T001';
const TASK_DETAIL_OVERVIEW_URL = '/pages/task-management/task-detail.panels/overview.html';

const ZH_PLACEHOLDER = '輸入通過、修正、無法裁決的判定原則、理由要求與注意事項。';
const EN_PLACEHOLDER = 'Enter criteria for approve, modify, and cannot adjudicate decisions, including reason requirements and cautions.';
const RETIRED_COPY = /退回條件|rejection criteria|rework/i;

async function expectCurrentPlaceholder(field: Locator, copy: string): Promise<void> {
  await expect(field).toHaveAttribute('placeholder', copy);
  await expect(field).not.toHaveAttribute('placeholder', RETIRED_COPY);
}

test('Task New static HTML starts with current Chinese reviewer guidance', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(TASK_NEW_URL);
    await expectCurrentPlaceholder(page.locator('#reviewerGuidelineTextInput'), ZH_PLACEHOLDER);
  } finally {
    await context.close();
  }
});

test('Task Detail overview partial starts with current Chinese reviewer guidance', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(TASK_DETAIL_OVERVIEW_URL);
    await expectCurrentPlaceholder(page.locator('#editReviewerGuidelineTextInput'), ZH_PLACEHOLDER);
  } finally {
    await context.close();
  }
});

test('Task New reviewer guidance follows the language toggle in both directions', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('labelsuite.lang', 'zh'));
  await page.goto(TASK_NEW_URL);

  const field = page.locator('#reviewerGuidelineTextInput');
  await page.locator('#langToggle').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expectCurrentPlaceholder(field, EN_PLACEHOLDER);

  await page.locator('#langToggle').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
  await expectCurrentPlaceholder(field, ZH_PLACEHOLDER);
});

test('Task Detail reviewer guidance follows the language toggle in both directions', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('labelsuite.lang', 'zh'));
  await page.goto(TASK_DETAIL_URL);
  await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: 15_000 });
  await page.locator('#guidelineEditBtn').click();

  const field = page.locator('#editReviewerGuidelineTextInput');
  await page.locator('#langToggle').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expectCurrentPlaceholder(field, EN_PLACEHOLDER);

  await page.locator('#langToggle').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
  await expectCurrentPlaceholder(field, ZH_PLACEHOLDER);
});
