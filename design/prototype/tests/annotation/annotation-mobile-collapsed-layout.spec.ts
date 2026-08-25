import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, skipGuidelineModal } from './_workspace-helpers';

/*
 * Traceability: specs/annotation/015-annotation-workspace/spec.md
 *   FR-018, SC-005
 */

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

/* w6-resilience-a11y.md RESP-01: the annotator variant above pins the
 * single-column width; the reviewer variant additionally pins that the
 * review workflow's primary action (送出審核) stays reachable inside the
 * 390px viewport -- the annex's "core actions remain operable" clause. */
test('reviewer mode keeps single-column width and a reachable submit control on mobile (RESP-01)', async ({ page }) => {
  await skipGuidelineModal(page);
  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer' }));
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

  const submitBtn = page.getByTestId('ws-review-submit-btn');
  await submitBtn.scrollIntoViewIfNeeded();
  await expect(submitBtn).toBeVisible();
  const box = await submitBtn.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
});
