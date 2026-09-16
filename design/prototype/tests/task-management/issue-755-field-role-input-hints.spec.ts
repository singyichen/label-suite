import { test, expect } from '@playwright/test';

const TASK_NEW_URL = '/pages/task-management/task-new.html';

test.describe('Issue #755 — Step 1 field role Input name hints', () => {
  test('exposes a config-driven FIELD_ROLE_INPUT_NAME_HINTS array of non-empty strings including "text"', async ({ page }) => {
    await page.goto(TASK_NEW_URL);

    const hints = await page.evaluate(() => {
      const win = window as typeof window & { FIELD_ROLE_INPUT_NAME_HINTS?: string[] };
      return win.FIELD_ROLE_INPUT_NAME_HINTS;
    });

    expect(Array.isArray(hints)).toBe(true);
    expect(hints!.length).toBeGreaterThanOrEqual(1);
    for (const hint of hints!) {
      expect(typeof hint).toBe('string');
      expect(hint.length).toBeGreaterThan(0);
    }
    expect(hints).toContain('text');
  });
});
