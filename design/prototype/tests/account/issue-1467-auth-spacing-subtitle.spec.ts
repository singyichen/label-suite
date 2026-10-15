/**
 * Auth pages — form spacing parity and success-state subtitle (issue #1467)
 *
 * The four standalone auth pages drift in vertical rhythm and leave a stale
 * instructional subtitle visible after success. Asserts, at 1440px in light mode:
 *   - spacing parity: `.form` gap 16px, first `.field` gap 6px, primary submit
 *     button margin-top 4px, `.card-subtitle` line-height 1.5 x font-size;
 *   - forgot-password success swaps the subtitle (zh + en) and keeps it
 *     swapped across a language toggle;
 *   - reset-password success swaps the subtitle (zh + en), the prototype state
 *     switcher restores the original subtitle, and expired/used token states
 *     keep the invalid-link subtitle (unchanged guard).
 *
 * Traceability: REGRESSION-RISK — auth-page layout rhythm and success-state
 *   subtitle copy consistency; issue #1467. No feature-spec FR.
 */
import { test, expect } from '../fixtures';

const AUTH_PAGES = [
  { name: 'login', url: '/pages/account/login.html', submit: '.login-btn' },
  { name: 'register', url: '/pages/account/register.html', submit: '.submit-btn' },
  { name: 'forgot-password', url: '/pages/account/forgot-password.html', submit: '.submit-btn' },
  { name: 'reset-password', url: '/pages/account/reset-password.html', submit: '.submit-btn' },
];

const FORGOT_URL = '/pages/account/forgot-password.html';
const RESET_URL = '/pages/account/reset-password.html';
const CJK = /[㐀-鿿]/;

test.describe('auth pages — spacing parity at 1440px (light)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const { name, url, submit } of AUTH_PAGES) {
    test(`${name}: form gap 16, field gap 6, submit margin-top 4, subtitle line-height 1.5`, async ({
      page,
    }) => {
      await page.goto(url);
      const m = await page.evaluate((submitSel) => {
        const cs = (sel: string) => window.getComputedStyle(document.querySelector(sel) as Element);
        const sub = cs('.card-subtitle');
        return {
          formGap: cs('.form').rowGap,
          fieldGap: cs('.field').rowGap,
          submitMarginTop: cs(submitSel).marginTop,
          subLineHeight: sub.lineHeight,
          subFontSize: sub.fontSize,
        };
      }, submit);
      expect.soft(m.formGap, `${name} .form gap`).toBe('16px');
      expect.soft(m.fieldGap, `${name} .field gap`).toBe('6px');
      expect.soft(m.submitMarginTop, `${name} submit margin-top`).toBe('4px');
      expect.soft(m.subFontSize, `${name} subtitle font-size`).toBe('15px');
      expect.soft(m.subLineHeight, `${name} subtitle line-height`).toBe('22.5px');
    });
  }
});

const FORGOT_SUBTITLES = [
  { lang: 'zh', toggle: false, text: '重設連結已寄出，請查看信箱', cjk: true },
  { lang: 'en', toggle: true, text: 'Reset link sent. Check your inbox.', cjk: false },
];

test.describe('forgot-password — success-state subtitle', () => {
  for (const { lang, toggle, text, cjk } of FORGOT_SUBTITLES) {
    test(`${lang}: success swaps the subtitle`, async ({ page }) => {
      await page.goto(FORGOT_URL);
      if (toggle) await page.getByTestId('lang-toggle').click();
      const subtitle = page.locator('#cardSubtitle');
      const original = (await subtitle.textContent()) ?? '';
      await page.getByTestId('email-input').fill('name@example.com');
      await page.getByTestId('send-reset-btn').click();
      await expect(page.locator('#successPanel')).toHaveClass(/visible/, { timeout: 5000 });
      await expect(subtitle).toBeVisible();
      await expect(subtitle).toHaveText(text);
      expect(CJK.test(text)).toBe(cjk);
      expect(text).not.toBe(original);
    });
  }

  test('toggling language in success state keeps the swapped subtitle', async ({ page }) => {
    await page.goto(FORGOT_URL);
    await page.getByTestId('email-input').fill('name@example.com');
    await page.getByTestId('send-reset-btn').click();
    await expect(page.locator('#successPanel')).toHaveClass(/visible/, { timeout: 5000 });
    const subtitle = page.locator('#cardSubtitle');
    await expect(subtitle).toHaveText('重設連結已寄出，請查看信箱');
    await page.getByTestId('lang-toggle').click();
    await expect(subtitle).toBeVisible();
    await expect(subtitle).toHaveText('Reset link sent. Check your inbox.');
    await page.getByTestId('lang-toggle').click();
    await expect(subtitle).toHaveText('重設連結已寄出，請查看信箱');
  });
});

const RESET_SUBTITLES = [
  { lang: 'zh', toggle: false, success: '密碼已更新', original: '設定新密碼以完成重設' },
  {
    lang: 'en',
    toggle: true,
    success: 'Password updated',
    original: 'Set a new password to complete your reset',
  },
];

test.describe('reset-password — success-state subtitle', () => {
  for (const { lang, toggle, success, original } of RESET_SUBTITLES) {
    test(`${lang}: success swaps the subtitle, state switcher restores it`, async ({ page }) => {
      await page.goto(RESET_URL);
      if (toggle) await page.getByTestId('lang-toggle').click();
      const subtitle = page.locator('#cardSubtitle');
      await expect(subtitle).toHaveText(original);
      await page.getByTestId('new-password-input').fill('newpassword123');
      await page.getByTestId('confirm-password-input').fill('newpassword123');
      await page.getByTestId('update-password-btn').click();
      await expect(page.locator('#successPanel')).toHaveClass(/visible/, { timeout: 5000 });
      await expect(subtitle).toBeVisible();
      await expect(subtitle).toHaveText(success);
      expect(CJK.test(success)).toBe(lang === 'zh');

      await page.evaluate(() => (window as unknown as { showState: (s: string) => void }).showState('valid'));
      await expect(subtitle).toHaveText(original);
    });
  }

  const INVALID = [
    { lang: 'zh', toggle: false, text: '連結無效' },
    { lang: 'en', toggle: true, text: 'Invalid link' },
  ];
  for (const { lang, toggle, text } of INVALID) {
    for (const state of ['已過期', '已使用']) {
      test(`guard ${lang}: ${state} token state keeps subtitle "${text}"`, async ({ page }) => {
        await page.goto(RESET_URL);
        if (toggle) await page.getByTestId('lang-toggle').click();
        await page.getByRole('button', { name: state }).click();
        await expect(page.locator('#cardSubtitle')).toHaveText(text);
      });
    }
  }
});
