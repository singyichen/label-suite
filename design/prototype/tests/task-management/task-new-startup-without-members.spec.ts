/*
 * Traceability: specs/task-management/013-task-new/spec.md
 *   FR-004a, SC-002c
 */
import { test, expect } from '@playwright/test';

const TASK_NEW_URL = '/pages/task-management/task-new.html';

test.describe('Task new startup step without member management', () => {
  test('step 3 hides member management and allows moving to step 4 with sampling only', async ({ page }) => {
    await page.goto(TASK_NEW_URL);

    await page.evaluate(() => {
      const win = window as typeof window & { showStep: (step: number) => void };
      win.showStep(3);
    });

    await expect(page.locator('#startupMemberTitle')).toHaveCount(0);
    await expect(page.locator('#memberList')).toHaveCount(0);
    await expect(page.locator('#s3NoticeText')).toHaveText('完成任務建立後，再邀請標記員與審核員加入任務。');

    await page.locator('#samplingValueInput').fill('150');
    await expect(page.locator('#nextBtn')).toBeEnabled();

    await page.locator('#nextBtn').click();

    await expect(page.locator('#step4Panel')).toBeVisible();
  });
});
