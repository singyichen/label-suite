/**
 * Register page prototype tests
 * Source spec: specs/account/003-register-email-password/spec.md
 *
 * Tests that can be validated against the static HTML prototype:
 *   - US1.1  Valid form → success banner + redirect to pending.html
 *   - US1.3  Cancel / back-to-login navigates to login.html
 *   - US2.1  Empty fields → per-field required errors, no request sent
 *   - US2.2  Password mismatch → error, no request sent
 *   - US2.3  Password < 8 chars → error, no request sent
 *   - US2.4  Duplicate email (simulated) → server error banner displayed
 *   - Language toggle switches text immediately (spec FR-010)
 *   - Responsive rendering at 375px / 768px / 1440px (spec FR-009)
 *
 * Tests NOT covered here (require backend):
 *   - US1.2  Newly registered account can log in and reach /pending
 *   - US1.4  Already-logged-in user redirected to /dashboard
 */
import { test, expect } from '@playwright/test';

const REGISTER_URL = '/pages/account/register.html';

// Helper: fill and submit the form with valid data
async function fillValidForm(
  page: import('@playwright/test').Page,
  overrides: { email?: string } = {}
) {
  await page.getByTestId('name-input').fill('Test User');
  await page.getByTestId('email-input').fill(overrides.email ?? 'newuser@example.com');
  await page.getByTestId('password-input').fill('password123');
  await page.getByTestId('confirm-password-input').fill('password123');
}

test.describe('Register page — successful registration (spec 003 US1.1)', () => {
  test('shows success banner after valid form submission', async ({ page }) => {
    await page.goto(REGISTER_URL);
    await fillValidForm(page);
    await page.getByTestId('submit-btn').click();
    await expect(page.getByTestId('success-banner')).toBeVisible();
  });

  test('redirects to pending.html after successful registration', async ({ page }) => {
    await page.goto(REGISTER_URL);
    await fillValidForm(page);
    await page.getByTestId('submit-btn').click();
    // Prototype simulates 2-second redirect
    await expect(page).toHaveURL(/pending\.html/, { timeout: 5000 });
  });
});

test.describe('Register page — navigation (spec 003 US1.3)', () => {
  test('back-to-login link navigates to login.html', async ({ page }) => {
    await page.goto(REGISTER_URL);
    await page.getByTestId('login-link').click();
    await expect(page).toHaveURL(/login\.html/);
  });
});

test.describe('Register page — form validation (spec 003 US2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(REGISTER_URL);
  });

  test('US2.1 shows name required error when name is empty', async ({ page }) => {
    await page.getByTestId('email-input').fill('user@example.com');
    await page.getByTestId('password-input').fill('password123');
    await page.getByTestId('confirm-password-input').fill('password123');
    await page.getByTestId('submit-btn').click();

    const nameError = page.getByTestId('name-error');
    await expect(nameError).toBeVisible();
    await expect(nameError).not.toBeEmpty();
  });

  test('US2.1 shows email required error when email is empty', async ({ page }) => {
    await page.getByTestId('name-input').fill('Test User');
    await page.getByTestId('password-input').fill('password123');
    await page.getByTestId('confirm-password-input').fill('password123');
    await page.getByTestId('submit-btn').click();

    const emailError = page.getByTestId('email-error');
    await expect(emailError).toBeVisible();
    await expect(emailError).not.toBeEmpty();
  });

  test('US2.1 shows password required error when password is empty', async ({ page }) => {
    await page.getByTestId('name-input').fill('Test User');
    await page.getByTestId('email-input').fill('user@example.com');
    await page.getByTestId('submit-btn').click();

    const passwordError = page.getByTestId('password-error');
    await expect(passwordError).toBeVisible();
    await expect(passwordError).not.toBeEmpty();
  });

  test('US2.1 does not navigate away on validation failure', async ({ page }) => {
    await page.getByTestId('submit-btn').click();
    await expect(page).toHaveURL(/register\.html/);
  });

  test('US2.2 shows mismatch error when passwords do not match', async ({ page }) => {
    await page.getByTestId('name-input').fill('Test User');
    await page.getByTestId('email-input').fill('user@example.com');
    await page.getByTestId('password-input').fill('password123');
    await page.getByTestId('confirm-password-input').fill('different456');
    await page.getByTestId('submit-btn').click();

    const confirmError = page.getByTestId('confirm-password-error');
    await expect(confirmError).toBeVisible();
    await expect(confirmError).not.toBeEmpty();
  });

  test('US2.3 shows too-short error when password has fewer than 8 characters', async ({ page }) => {
    await page.getByTestId('name-input').fill('Test User');
    await page.getByTestId('email-input').fill('user@example.com');
    await page.getByTestId('password-input').fill('short');
    await page.getByTestId('confirm-password-input').fill('short');
    await page.getByTestId('submit-btn').click();

    const passwordError = page.getByTestId('password-error');
    await expect(passwordError).toBeVisible();
    await expect(passwordError).not.toBeEmpty();
  });

  test('US2.4 shows server error when email is already taken (simulated)', async ({ page }) => {
    // Prototype simulates duplicate email with "taken@example.com"
    await fillValidForm(page, { email: 'taken@example.com' });
    await page.getByTestId('submit-btn').click();

    const errorBanner = page.getByTestId('error-banner');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).not.toBeEmpty();
  });

  test('US2.4 does not create account for duplicate email (stays on register page)', async ({ page }) => {
    await fillValidForm(page, { email: 'taken@example.com' });
    await page.getByTestId('submit-btn').click();
    await expect(page).toHaveURL(/register\.html/);
  });
});

test.describe('Register page — language toggle (spec 003 FR-010)', () => {
  test('switches all text to English immediately without page reload', async ({ page }) => {
    await page.goto(REGISTER_URL);

    await expect(page.getByTestId('lang-label')).toHaveText(/ZH/);

    await page.getByTestId('lang-toggle').click();

    await expect(page.getByTestId('lang-label')).toHaveText(/EN/);
    await expect(page.getByTestId('submit-btn')).toContainText('Create Account');
  });

  test('toggles back to Traditional Chinese on second click', async ({ page }) => {
    await page.goto(REGISTER_URL);
    await page.getByTestId('lang-toggle').click();
    await page.getByTestId('lang-toggle').click();
    await expect(page.getByTestId('lang-label')).toHaveText(/ZH/);
    await expect(page.getByTestId('submit-btn')).toContainText('建立帳號');
  });
});

test.describe('Register page — responsive rendering (spec 003 FR-009)', () => {
  const viewports = [
    { name: '375px (mobile)', width: 375, height: 812 },
    { name: '768px (tablet)', width: 768, height: 1024 },
    { name: '1440px (desktop)', width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    test(`renders without horizontal overflow at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(REGISTER_URL);

      await expect(page.getByTestId('name-input')).toBeVisible();
      await expect(page.getByTestId('submit-btn')).toBeVisible();

      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const clientWidth = await page.evaluate(() => document.body.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    });
  }
});
