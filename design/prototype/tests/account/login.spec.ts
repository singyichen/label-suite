/**
 * Login page prototype tests
 * Source spec: specs/account/001-login-email-password/spec.md
 *
 * Tests that can be validated against the static HTML prototype:
 *   - US1.5  Page contains all required UI elements
 *   - US1.6  Language toggle switches text immediately
 *   - US1.7  Responsive rendering at 375px / 768px / 1440px
 *   - Form validation: empty submit shows per-field errors
 *   - Navigation: register link → register.html
 *   - Navigation: forgot-password link → forgot-password.html
 *
 * Tests NOT covered here (require backend):
 *   - US1.1  Login with role≠null → /dashboard
 *   - US1.2  Login with role=null → /pending
 *   - US1.4  Already-logged-in user redirected to /dashboard
 *   - US2    Logout clears JWT
 *   - US3    Protected-route guard
 */
import { test, expect } from '@playwright/test';

const LOGIN_URL = '/pages/account/login.html';

test.describe('Login page — UI elements (spec 001 US1.5)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LOGIN_URL);
  });

  test('contains Google login button', async ({ page }) => {
    await expect(page.getByTestId('google-login-btn')).toBeVisible();
  });

  test('contains email input', async ({ page }) => {
    await expect(page.getByTestId('email-input')).toBeVisible();
  });

  test('contains password input', async ({ page }) => {
    await expect(page.getByTestId('password-input')).toBeVisible();
  });

  test('contains login submit button', async ({ page }) => {
    await expect(page.getByTestId('login-btn')).toBeVisible();
  });

  test('contains register link pointing to /register', async ({ page }) => {
    const link = page.getByTestId('register-link');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', /register\.html/);
  });

  test('contains forgot-password link pointing to /forgot-password', async ({ page }) => {
    const link = page.getByTestId('forgot-password-link');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', /forgot-password\.html/);
  });
});

test.describe('Login page — language toggle (spec 001 US1.6)', () => {
  test('switches all text to English immediately without page reload', async ({ page }) => {
    await page.goto(LOGIN_URL);

    // Initial state: Traditional Chinese
    await expect(page.getByTestId('lang-label')).toHaveText(/ZH/);

    // Click language toggle
    await page.getByTestId('lang-toggle').click();

    // Label switches immediately
    await expect(page.getByTestId('lang-label')).toHaveText(/EN/);

    // Login button text changes
    await expect(page.getByTestId('login-btn')).toContainText('Sign In');
  });

  test('toggles back to Traditional Chinese on second click', async ({ page }) => {
    await page.goto(LOGIN_URL);
    await page.getByTestId('lang-toggle').click(); // ZH → EN
    await page.getByTestId('lang-toggle').click(); // EN → ZH
    await expect(page.getByTestId('lang-label')).toHaveText(/ZH/);
    await expect(page.getByTestId('login-btn')).toContainText('登入');
  });
});

test.describe('Login page — form validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LOGIN_URL);
  });

  test('shows email error when submitting empty email', async ({ page }) => {
    await page.getByTestId('login-btn').click();
    const emailError = page.getByTestId('email-error');
    await expect(emailError).toBeVisible();
    await expect(emailError).not.toBeEmpty();
    await expect(page.getByTestId('password-error')).not.toBeVisible();
  });

  test('shows password error when email filled but password empty', async ({ page }) => {
    await page.getByTestId('email-input').fill('user@example.com');
    await page.getByTestId('login-btn').click();
    const passwordError = page.getByTestId('password-error');
    await expect(passwordError).toBeVisible();
    await expect(passwordError).not.toBeEmpty();
    await expect(page.getByTestId('email-error')).not.toBeVisible();
  });

  test('shows errors and stays on page on frontend validation failure', async ({ page }) => {
    await page.getByTestId('login-btn').click();
    await expect(page.getByTestId('email-error')).toBeVisible();
    await expect(page.getByTestId('email-error')).not.toBeEmpty();
  });
});

test.describe('Login page — navigation', () => {
  test('register link navigates to register page', async ({ page }) => {
    await page.goto(LOGIN_URL);
    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('register.html')),
      page.getByTestId('register-link').click(),
    ]);
    expect(response.status()).toBe(200);
    await expect(page).toHaveURL(/register\.html/);
  });

  test('forgot-password link navigates to forgot-password page', async ({ page }) => {
    await page.goto(LOGIN_URL);
    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('forgot-password.html')),
      page.getByTestId('forgot-password-link').click(),
    ]);
    expect(response.status()).toBe(200);
    await expect(page).toHaveURL(/forgot-password\.html/);
  });
});

test.describe('Login page — responsive rendering (spec 001 US1.7)', () => {
  const viewports = [
    { name: '375px (mobile)', width: 375, height: 812 },
    { name: '768px (tablet)', width: 768, height: 1024 },
    { name: '1440px (desktop)', width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    test(`renders without horizontal overflow at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(LOGIN_URL);

      // Key elements visible at all breakpoints
      await expect(page.getByTestId('email-input')).toBeVisible();
      await expect(page.getByTestId('login-btn')).toBeVisible();

      // No horizontal scroll
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const clientWidth = await page.evaluate(() => document.body.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    });
  }
});
