import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, skipGuidelineModal } from './_workspace-helpers';

test('keeps single-column content width on mobile even after guideline panel is collapsed', async ({ page }) => {
  await skipGuidelineModal(page);
  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
  await dismissGuidelineModal(page);

  await page.getByTestId('ws-guideline-collapse-btn').click();
  await page.setViewportSize({ width: 390, height: 844 });

  const metrics = await page.evaluate(() => {
    const workspaceBody = document.getElementById('workspaceBody');
    const contentColumn = document.querySelector('.col-content') as HTMLElement | null;
    if (!workspaceBody || !contentColumn) return null;
    const bodyWidth = workspaceBody.getBoundingClientRect().width;
    const contentWidth = contentColumn.getBoundingClientRect().width;
    return { bodyWidth, contentWidth };
  });

  expect(metrics).not.toBeNull();
  expect(metrics!.contentWidth).toBeGreaterThan(metrics!.bodyWidth * 0.9);
});
