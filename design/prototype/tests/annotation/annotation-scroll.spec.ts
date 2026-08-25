import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/*
 * Traceability: specs/annotation/015-annotation-workspace/spec.md
 *   FR-017
 */

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test('middle annotation area can scroll to note section', async ({ page }) => {
  // T005: multi_dim (3 sliders) gives enough vertical content to overflow.
  await page.goto(buildWorkspaceUrl({ task_id: 'T005', sample_id: 'mt-001' }));

  const before = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="ws-content-scroll"]') as HTMLElement | null;
    if (!el) return null;
    return {
      scrollTop: el.scrollTop,
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
      canScroll: el.scrollHeight > el.clientHeight,
    };
  });
  expect(before).not.toBeNull();
  expect(before!.canScroll).toBeTruthy();

  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="ws-content-scroll"]') as HTMLElement | null;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  });

  await page.waitForTimeout(200);

  const after = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="ws-content-scroll"]') as HTMLElement | null;
    if (!el) return null;
    return { scrollTop: el.scrollTop };
  });
  expect(after).not.toBeNull();
  expect(after!.scrollTop).toBeGreaterThan(0);

  const noteLabel = page.getByTestId('ws-note-label');
  await expect(noteLabel).toBeVisible();
});
