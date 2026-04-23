import { test, expect } from '@playwright/test';

test('middle annotation area can scroll to note section', async ({ page }) => {
  await page.goto('/pages/annotation/annotation-workspace.html?task_type=single_sentence_va_scoring');
  await page.waitForTimeout(500);

  const before = await page.evaluate(() => {
    const el = document.getElementById('contentScroll') as HTMLElement | null;
    if (!el) return null;
    return {
      scrollTop: el.scrollTop,
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
      canScroll: el.scrollHeight > el.clientHeight,
    };
  });
  console.log('before', before);

  expect(before).not.toBeNull();
  expect(before!.canScroll).toBeTruthy();

  await page.evaluate(() => {
    const el = document.getElementById('contentScroll') as HTMLElement | null;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  });

  await page.waitForTimeout(200);

  const after = await page.evaluate(() => {
    const el = document.getElementById('contentScroll') as HTMLElement | null;
    if (!el) return null;
    return {
      scrollTop: el.scrollTop,
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
      maxScrollTop: el.scrollHeight - el.clientHeight,
    };
  });
  console.log('after', after);

  expect(after).not.toBeNull();
  expect(after!.scrollTop).toBeGreaterThan(0);

  const noteLabel = page.locator('#annotationNoteLabel');
  await expect(noteLabel).toBeVisible();
});
