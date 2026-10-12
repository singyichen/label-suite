import { test, expect } from '../fixtures';

/**
 * Red/Green contract for issue #1071: the shared fixture must neutralise CSS
 * transitions and animations for every spec that takes `page` from it, so a
 * computed-style read never lands on an in-flight interpolation.
 *
 * `.step-circle` (task-new.html) declares `transition: all var(--dur-fast)`,
 * which is the exact exposure the issue describes.
 */
const URL = '/pages/task-management/task-new.html';

test.describe('shared fixture disables motion (#1071)', () => {
  test('page from the fixture reports a zero transition-duration', async ({ page }) => {
    await page.goto(URL);
    const duration = await page
      .locator('.step-circle')
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(duration).toBe('0s');
  });

  test('a second page opened from the same context is covered too', async ({ context }) => {
    const other = await context.newPage();
    await other.goto(URL);
    const duration = await other
      .locator('.step-circle')
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(duration).toBe('0s');
  });

  test.describe('opting out with disableMotion=false', () => {
    test.use({ disableMotion: false });

    test('keeps the page-authored transition', async ({ page }) => {
      await page.goto(URL);
      const duration = await page
        .locator('.step-circle')
        .first()
        .evaluate((el) => getComputedStyle(el).transitionDuration);
      expect(duration).not.toBe('0s');
    });
  });
});
