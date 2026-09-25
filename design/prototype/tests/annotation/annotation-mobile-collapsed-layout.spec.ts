import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, gotoReviewerWorkspace, skipGuidelineModal } from './_workspace-helpers';

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
  await gotoReviewerWorkspace(page, { task_id: 'T001', sample_id: 'sent-001' });
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

  /* issue #933: `.sample-progress-summary`'s min-width squeezes the
   * prev/next nav buttons below their natural single-line width at 390px,
   * wrapping the icon+label onto two lines. A correctly laid-out button is
   * ~35.6px tall; the wrapped/broken layout is ~78.8px. 45 is a safe
   * threshold below the broken height with headroom above the correct one. */
  const prevBox = await page.locator('#wsPrevBtn').boundingBox();
  const nextBox = await page.locator('#wsNextBtn').boundingBox();
  expect(prevBox).not.toBeNull();
  expect(nextBox).not.toBeNull();
  expect(prevBox!.height).toBeLessThanOrEqual(45);
  expect(nextBox!.height).toBeLessThanOrEqual(45);

  /* issue #933: the always-visible collapsed guideline mobile-drawer handle
   * is a fixed 52px bottom bar that `.action-bar`'s padding doesn't reserve
   * clearance for, so the review submit button's bottom edge sinks below
   * the handle's top edge and the two overlap. */
  const handleBox = await page.locator('#wsMobileDrawerHandle').boundingBox();
  expect(handleBox).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(handleBox!.y);
});

/* issue #933: desktop regression guard -- the reviewer workspace at 1440x900
 * never had the mobile drawer-handle/nav-wrap bugs, and this locks that in
 * so a fix scoped to mobile breakpoints doesn't accidentally shrink the
 * desktop sample list column or reintroduce nav-button wrapping there. */
test('reviewer mode keeps sample list and single-line nav buttons on desktop (issue #933 regression guard)', async ({
  page,
}) => {
  await skipGuidelineModal(page);
  await gotoReviewerWorkspace(page, { task_id: 'T015', sample_id: 'ofs-04-pending-review' });
  await dismissGuidelineModal(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  const colSamples = page.locator('.col-samples');
  await expect(colSamples).toHaveCSS('display', 'flex');
  const colSamplesBox = await colSamples.boundingBox();
  expect(colSamplesBox).not.toBeNull();
  expect(colSamplesBox!.width).toBe(256);

  const prevBox = await page.locator('#wsPrevBtn').boundingBox();
  const nextBox = await page.locator('#wsNextBtn').boundingBox();
  expect(prevBox).not.toBeNull();
  expect(nextBox).not.toBeNull();
  expect(prevBox!.height).toBeLessThanOrEqual(45);
  expect(nextBox!.height).toBeLessThanOrEqual(45);
});
