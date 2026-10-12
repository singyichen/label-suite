/*
 * Traceability: issue #1252 -- `.btn:hover { transform: translateY(-1px) }`.
 * The lift moves the button's box up 1px, so its bottom 1px stops being under a
 * pointer parked on the lower edge. :hover drops, the button drops back, :hover
 * returns -- a per-frame flicker (Playwright never sees the button as stable).
 * Contract: a pointer on the button's bottom edge keeps :hover on every frame.
 * Transitions are off via the shared fixture (#1071), which makes the flip
 * deterministic rather than a timing race.
 */
import { test, expect } from '../fixtures';
import type { Locator, Page } from '@playwright/test';

const FRAMES = 12;

/** Park the pointer 0.5px above the button's bottom edge, then sample :hover per frame. */
async function hoverSamplesAtBottomEdge(page: Page, button: Locator): Promise<boolean[]> {
  await button.scrollIntoViewIfNeeded();
  const box = await button.boundingBox();
  if (!box) throw new Error('button has no bounding box');
  // Settle hover first so the rest-state box is not the one being sampled.
  await page.mouse.move(0, 0);
  const x = box.x + box.width / 2;
  const y = box.y + box.height - 0.5;
  await page.mouse.move(x, y);
  return button.evaluate(
    (el, n) =>
      new Promise<boolean[]>((resolve) => {
        const out: boolean[] = [];
        const tick = () => {
          out.push(el.matches(':hover'));
          if (out.length >= n) resolve(out);
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    FRAMES,
  );
}

async function expectStableHover(page: Page, button: Locator) {
  await expect(button).toBeVisible();
  await expect(button).toBeEnabled();
  const samples = await hoverSamplesAtBottomEdge(page, button);
  expect(samples, 'button must stay :hover on every frame at its bottom edge').toEqual(
    Array(FRAMES).fill(true),
  );
}

test.describe('.btn hover hit area (issue #1252)', () => {
  test('task-detail: #reviewEditBtn keeps :hover on its bottom edge (issue #1252)', async ({ page }) => {
    await page.goto('/pages/task-management/task-detail.html');
    await page.locator('#tabSettings').click();
    await page.locator('#settingsTab-review').click();
    await expectStableHover(page, page.locator('#reviewEditBtn'));
  });

  test('annotation-workspace: #wsSaveBtn keeps :hover on its bottom edge (issue #1252)', async ({ page }) => {
    await page.goto(
      '/pages/annotation/annotation-workspace.html?task_id=T001&sample_id=S001&role=annotator&run_type=official_run',
    );
    await expectStableHover(page, page.locator('#wsSaveBtn'));
  });

  test('dataset-analysis-detail: #statsEmptyBtn keeps :hover on its bottom edge (issue #1252)', async ({ page }) => {
    await page.goto('/pages/dataset/dataset-analysis-detail.html?task_id=T001&s_state=empty');
    await expectStableHover(page, page.locator('#statsEmptyBtn'));
  });
});
