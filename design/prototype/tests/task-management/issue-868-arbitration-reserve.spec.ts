/**
 * Issue #868 companion contract for task-management/014 FR-010s-1.
 * A saved review configuration must leave at least one reviewer outside
 * arbiterIds, because annotation/015 reserves every designated arbiter from
 * new review assignment.
 */
import { test, expect, type Page } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';

async function openReviewEdit(page: Page, language: 'zh' | 'en' = 'zh'): Promise<void> {
  await page.goto(TASK_DETAIL_URL);
  if (language === 'en') await page.getByTestId('lang-toggle').click();
  await page.locator('#reviewEditBtn').click();
}

async function clearChecked(locator: ReturnType<Page['locator']>): Promise<void> {
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const box = locator.nth(index);
    if (await box.isChecked()) await box.uncheck();
  }
}

async function selectReviewers(page: Page, names: string[]): Promise<void> {
  await clearChecked(page.locator('#reviewerOptionList .reviewer-option input'));
  for (const name of names) {
    await page.locator('#reviewerOptionList .reviewer-option', { hasText: name }).locator('input').check();
  }
}

async function selectArbiters(page: Page, names: string[]): Promise<void> {
  await clearChecked(page.locator('#arbiterOptionList .arbiter-option input'));
  for (const name of names) {
    await page.locator('#arbiterOptionList .arbiter-option', { hasText: name }).locator('input').check();
  }
}

for (const language of ['zh', 'en'] as const) {
  test(`blocks save when every reviewer is also an arbiter (${language})`, async ({ page }) => {
    await openReviewEdit(page, language);
    const reviewerNames = ['Mandy Chen', 'Kevin Liu'];
    await selectReviewers(page, reviewerNames);
    await selectArbiters(page, reviewerNames);

    await page.locator('#reviewSaveBtn').click();

    await expect(page.locator('#reviewEditForm')).not.toHaveClass(/hidden/);
    await expect(page.locator('#reviewSettingsError')).toBeVisible();
    await expect(page.locator('#reviewSettingsError')).toHaveText(
      language === 'zh'
        ? '請至少保留一位未被指定為仲裁者的審核員。'
        : 'Keep at least one reviewer who is not designated as an arbiter.'
    );
  });
}

test('saves when at least one checked reviewer is not an arbiter', async ({ page }) => {
  await openReviewEdit(page);
  await selectReviewers(page, ['Mandy Chen', 'Kevin Liu']);
  await selectArbiters(page, ['Mandy Chen']);

  await page.locator('#reviewSaveBtn').click();

  await expect(page.locator('#reviewEditForm')).toHaveClass(/hidden/);
  await expect(page.locator('#valueReviewerIdsControl')).toHaveText('已勾選 2 人');
  await expect(page.locator('#valueArbiterIdsControl')).toHaveText('仲裁者 1 人');
});

test('an empty arbiter roster remains valid', async ({ page }) => {
  await openReviewEdit(page);
  await selectReviewers(page, ['Mandy Chen']);
  await selectArbiters(page, []);

  await page.locator('#reviewSaveBtn').click();

  await expect(page.locator('#reviewEditForm')).toHaveClass(/hidden/);
  await expect(page.locator('#valueReviewerIdsControl')).toHaveText('已勾選 1 人');
  await expect(page.locator('#valueArbiterIdsControl')).toHaveText('未指定仲裁者');
});

test('helper text explains that designated arbiters are reserved from review assignment', async ({ page }) => {
  await openReviewEdit(page);
  await expect(page.locator('#arbiterSelectHint')).toHaveText(
    '被指定者保留處理仲裁，不會收到新的審核單位；可留空，但爭議將無人可仲裁。'
  );

  await page.getByTestId('lang-toggle').click();
  await expect(page.locator('#arbiterSelectHint')).toHaveText(
    'Designated arbiters are reserved from new review assignment; leaving this empty means disputes cannot be arbitrated.'
  );
});
