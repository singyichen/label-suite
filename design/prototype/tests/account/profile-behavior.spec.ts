import { test, expect } from '@playwright/test';

const PROFILE_URL = '/pages/account/profile.html';

declare global {
  interface Window {
    showToast: (type: string, title: string, desc: string) => void;
    setState: (state: string) => void;
  }
}

test.describe('Profile — UXC-07 toast contract', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PROFILE_URL);
  });

  test('toast container is top-center at the toast z layer', async ({ page }) => {
    const style = await page.evaluate(() => {
      const el = document.getElementById('toast-container');
      if (!el) throw new Error('missing #toast-container');
      const cs = getComputedStyle(el);
      return { position: cs.position, top: cs.top, zIndex: cs.zIndex, width: cs.width };
    });
    expect(style.position).toBe('fixed');
    expect(style.top).toBe('24px');
    expect(style.zIndex).toBe('400');
    expect(style.width).toBe('384px');
  });

  test('success toast auto-dismisses on the 3000ms tier', async ({ page }) => {
    await page.evaluate(() => window.showToast('success', 'saved', ''));
    await expect(page.locator('.toast.success')).toBeVisible();
    await page.waitForTimeout(3500);
    // Tight timeout so the legacy 4000ms timer cannot satisfy the retry.
    await expect(page.locator('.toast.success')).toHaveCount(0, { timeout: 200 });
  });

  test('error toast never auto-dismisses and closes via its button', async ({ page }) => {
    await page.evaluate(() => window.showToast('error', 'failed', 'reason'));
    // Outlives the legacy 4000ms one-size timer.
    await page.waitForTimeout(4600);
    await expect(page.locator('.toast.error')).toBeVisible();
    await page.locator('.toast.error .toast-close').click();
    await expect(page.locator('.toast.error')).toHaveCount(0);
  });

  test('a new toast replaces the visible one (single-instance rule)', async ({ page }) => {
    await page.evaluate(() => {
      window.showToast('error', 'first', '');
      window.showToast('success', 'second', '');
    });
    await expect(page.locator('.toast')).toHaveCount(1);
    await expect(page.locator('.toast.success')).toBeVisible();
  });

  test('warning and info variants resolve semantic token colors', async ({ page }) => {
    await page.evaluate(() => window.showToast('warning', 'careful', ''));
    await expect(page.locator('.toast.warning')).toHaveCSS('color', 'rgb(161, 98, 7)');
    await page.evaluate(() => window.showToast('info', 'fyi', ''));
    await expect(page.locator('.toast.info')).toHaveCSS('color', 'rgb(29, 78, 216)');
  });
});

test.describe('Profile — UXC-06 submit loading state', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PROFILE_URL);
  });

  test('profile save disables the button while pending, then toasts success', async ({ page }) => {
    await page.locator('#fieldName').fill('Mandy Chen');
    await page.locator('#saveProfileBtn').click();
    await expect(page.locator('#saveProfileBtn')).toBeDisabled();
    await expect(page.locator('#saveProfileBtn')).toHaveClass(/is-loading/);
    await expect(page.locator('.toast.success')).toBeVisible();
    await expect(page.locator('#saveProfileBtn')).toBeEnabled();
  });

  test('wrong current password keeps inputs and surfaces the field error after loading', async ({ page }) => {
    await page.evaluate(() => window.setState('error'));
    await page.locator('#fieldCurrentPw').fill('wrong-password');
    await page.locator('#fieldNewPw').fill('NewPassw0rd');
    await page.locator('#fieldConfirmPw').fill('NewPassw0rd');
    await page.locator('#savePwBtn').click();
    await expect(page.locator('#savePwBtn')).toBeDisabled();
    await expect(page.locator('#currentPwError')).toBeVisible();
    await expect(page.locator('#savePwBtn')).toBeEnabled();
    // UXC-06: never clear form data on failure.
    await expect(page.locator('#fieldNewPw')).toHaveValue('NewPassw0rd');
  });
});

test.describe('Profile — a11y behavior gaps', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PROFILE_URL);
  });

  test('rejected avatar file announces an error instead of failing silently', async ({ page }) => {
    await page.locator('#avatarInput').setInputFiles({
      name: 'avatar.gif',
      mimeType: 'image/gif',
      buffer: Buffer.from('GIF89a'),
    });
    const error = page.locator('#avatarError');
    await expect(error).toBeVisible();
    await expect(error).toHaveAttribute('role', 'alert');
    await expect(error).not.toHaveText('');
  });

  test('skeleton state is announced as busy', async ({ page }) => {
    await expect(page.locator('#skeletonState')).toHaveAttribute('aria-busy', 'true');
  });

  test('notification toggles follow the MASTER label>input+slider contract', async ({ page }) => {
    const labels = page.locator('#notification-section label.toggle-switch');
    await expect(labels).toHaveCount(12);
    const first = labels.first();
    await expect(first.locator('input[type="checkbox"]')).toBeChecked();
    await expect(first.locator('.toggle-slider')).toHaveCSS('background-color', 'rgb(99, 102, 241)');
    await first.click();
    await expect(first.locator('input[type="checkbox"]')).not.toBeChecked();
    await expect(first.locator('.toggle-slider')).toHaveCSS('background-color', 'rgb(226, 232, 240)');
  });
});
