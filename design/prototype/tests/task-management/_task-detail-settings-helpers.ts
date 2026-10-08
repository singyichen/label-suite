/*
 * Traceability: specs/task-management/014-task-detail/spec.md FR-026 (1)(2), FR-019 (section param).
 * Issue #1199 G2: the five setting sections live in the 設定 tab behind a section nav, so a
 * suite that edits or reads one of them first has to open it. This helper does exactly that
 * through the user-facing controls; it never changes what a test asserts.
 */
import { expect, type Page } from '@playwright/test';

export type SettingsSlug = 'basic' | 'labeling' | 'guideline' | 'sampling' | 'review';

/** Open the 設定 tab and select one section, on an already-loaded task-detail page. */
export async function openSettingsSection(page: Page, slug: SettingsSlug) {
  const panel = page.locator('#settingsPanel');
  if (!(await panel.isVisible())) {
    await page.locator('#tabSettings').click();
    await expect(panel).toBeVisible();
  }
  const tab = page.locator(`#settingsTab-${slug}`);
  if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}
