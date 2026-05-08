import { test, expect } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';

test.describe('Task detail member management add flows', () => {
  test('supports search-add and email invite instead of candidate list', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);

    await page.locator('#tabMemberManagement').click();
    await expect(page.locator('#memberManagementPanel')).not.toHaveClass(/hidden/);

    await expect(page.locator('#candidateListTitle')).toHaveCount(0);
    await expect(page.locator('#memberSearchTitle')).toHaveText('搜尋平台成員');
    await expect(page.locator('#memberInviteTitle')).toHaveText('Email 邀請');
    await expect(page.locator('#memberSearchResultsBody')).toContainText('請先輸入帳號、姓名或 Email 再開始搜尋');
    await expect(page.locator('#memberSearchResultsBody')).not.toContainText('Jason Huang');

    await page.locator('#memberTableBody tr').filter({ hasText: 'Jason Huang' }).locator('button:has-text("移除")').click();
    await page.locator('#memberActionConfirmBtn').click();

    await page.locator('#memberSearchInput').fill('jason');
    await expect(page.locator('#memberSearchResultsBody tr')).toHaveCount(1);
    await expect(page.locator('#memberSearchResultsBody')).toContainText('Jason Huang');
    await expect(page.locator('#memberSearchResultsBody')).toContainText('jason.h@labelsuite.io');
    await expect(page.locator('#memberSearchResultsBody')).toContainText('jason.h');

    await page.locator('#memberSearchRoleSelect').selectOption('reviewer');
    await page.locator('#memberSearchResultsBody button:has-text("加入任務")').click();

    await expect(page.locator('#memberTableBody')).toContainText('Jason Huang');
    await expect(page.locator('#memberTableBody')).toContainText('jason.h@labelsuite.io');
    await expect(page.locator('#memberTableBody')).toContainText('審核員');

    await page.locator('#memberInviteEmailInput').fill('new.reviewer@example.com');
    await page.locator('#memberInviteRoleSelect').selectOption('reviewer');
    await page.locator('#memberInviteSendBtn').click();

    await expect(page.locator('#memberTableBody')).toContainText('new.reviewer@example.com');
    await expect(page.locator('#memberTableBody')).toContainText('邀請中');
  });
});
