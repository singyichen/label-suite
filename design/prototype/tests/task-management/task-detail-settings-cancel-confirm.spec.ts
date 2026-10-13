/*
 * Traceability: specs/task-management/014-task-detail/spec.md FR-026 (2); issue #1214.
 *
 * TDD Red. Contract: Cancel on a settings section with unsaved changes opens the in-page
 * alertdialog #settingsLeaveModal (the same one the section/tab-switch guards use), never
 * window.confirm.
 *   - Cancel + dirty draft: modal visible, edit form + edited value kept
 *   - 取消 / Cancel in the modal, or Escape: modal closes, edit mode + edit kept, focus returns
 *     to the Cancel button (the trigger)
 *   - 放棄變更 in the modal: modal closes, edit form hidden, summary shows the saved value,
 *     focus lands on the section's Edit button
 *   - Cancel on a clean form: leaves edit mode, no modal
 *   - English: modal title reads "Discard unsaved changes?"
 *   - window.confirm is never invoked (a 'dialog' listener is a tripwire only)
 *
 * Expected on current code: the dirty Cancel fires a native confirm and no modal opens.
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { openSettingsSection, type SettingsSlug } from './_task-detail-settings-helpers';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html?task_role=project_leader&task_id=T001';
const PANEL_LOAD_TIMEOUT = 15000;

interface SectionCase {
  slug: SettingsSlug;
  edit: string;
  cancel: string;
  form: string;
  summary: string;
  /** Make the draft dirty through user-facing input. */
  dirty: (page: Page) => Promise<void>;
  /** Locator-level assertion that the edited value is still in the form. */
  expectEdited: (page: Page) => Promise<void>;
}

const SECTIONS: SectionCase[] = [
  {
    slug: 'basic',
    edit: '#overviewEditBtn',
    cancel: '#overviewCancelBtn',
    form: '#overviewEditForm',
    summary: '#valueTaskName',
    dirty: async (page) => {
      await page.locator('#editTaskNameInput').fill('Edited task name 1214');
    },
    expectEdited: async (page) => {
      await expect(page.locator('#editTaskNameInput')).toHaveValue('Edited task name 1214');
    },
  },
  {
    slug: 'labeling',
    edit: '#settingsEditBtn',
    cancel: '#settingsCancelBtn',
    form: '#settingsEditForm',
    summary: '#settingsConfigView',
    dirty: async (page) => {
      await page.locator('#codeEditor').fill('outputs: []\n');
    },
    expectEdited: async (page) => {
      await expect(page.locator('#codeEditor')).toHaveValue('outputs: []\n');
    },
  },
  {
    slug: 'guideline',
    edit: '#guidelineEditBtn',
    cancel: '#guidelineCancelBtn',
    form: '#guidelineEditForm',
    summary: '#valueAnnotatorGuidelineContentSummary',
    dirty: async (page) => {
      await page.locator('#editAnnotatorGuidelineTextInput').fill('Edited guideline 1214');
    },
    expectEdited: async (page) => {
      await expect(page.locator('#editAnnotatorGuidelineTextInput')).toHaveValue('Edited guideline 1214');
    },
  },
  {
    slug: 'sampling',
    edit: '#samplingEditBtn',
    cancel: '#samplingCancelBtn',
    form: '#samplingEditForm',
    summary: '#valueSamplingValueControl',
    dirty: async (page) => {
      await page.locator('#samplingValue').fill('7');
    },
    expectEdited: async (page) => {
      await expect(page.locator('#samplingValue')).toHaveValue('7');
    },
  },
  {
    slug: 'review',
    edit: '#reviewEditBtn',
    cancel: '#reviewCancelBtn',
    form: '#reviewEditForm',
    summary: '#valueReviewerIdsControl',
    dirty: async (page) => {
      await page
        .locator('#reviewerOptionList .reviewer-option', { hasText: '王小明' })
        .locator('input')
        .uncheck();
    },
    expectEdited: async (page) => {
      await expect(
        page.locator('#reviewerOptionList .reviewer-option', { hasText: '王小明' }).locator('input'),
      ).not.toBeChecked();
    },
  },
];

const modal = (page: Page) => page.locator('#settingsLeaveModal');

/** Open the section in edit mode and return its saved summary text. */
async function enterEdit(page: Page, s: SectionCase): Promise<string> {
  await page.goto(TASK_DETAIL_URL);
  await openSettingsSection(page, s.slug);
  const editBtn = page.locator(s.edit);
  await expect(editBtn).toBeEnabled({ timeout: PANEL_LOAD_TIMEOUT });
  const saved = (await page.locator(s.summary).textContent()) ?? '';
  await editBtn.click();
  await expect(page.locator(s.form)).toBeVisible();
  return saved;
}

/** Tripwire only: records a native dialog; never drives the flow. */
function watchNativeDialog(page: Page) {
  const seen = { value: false };
  page.on('dialog', (d) => {
    seen.value = true;
    void d.dismiss();
  });
  return seen;
}

for (const s of SECTIONS) {
  test.describe(`settings cancel confirm: ${s.slug} (FR-026 (2), #1214)`, () => {
    test('Cancel with a dirty draft opens the leave alertdialog and keeps the edit', async ({ page }) => {
      const native = watchNativeDialog(page);
      await enterEdit(page, s);
      await s.dirty(page);

      await page.locator(s.cancel).click();

      await expect(modal(page)).toBeVisible();
      await expect(modal(page)).toHaveAttribute('role', 'alertdialog');
      await expect(page.locator(s.form)).toBeVisible();
      await s.expectEdited(page);
      expect(native.value, 'window.confirm must not be used').toBe(false);
    });

    test('keep editing closes the modal, keeps the edit and returns focus to Cancel', async ({ page }) => {
      const native = watchNativeDialog(page);
      await enterEdit(page, s);
      await s.dirty(page);
      await page.locator(s.cancel).click();
      await expect(modal(page)).toBeVisible();

      await page.locator('#settingsLeaveCancelBtn').click();

      await expect(modal(page)).toBeHidden();
      await expect(page.locator(s.form)).toBeVisible();
      await s.expectEdited(page);
      await expect(page.locator(s.cancel)).toBeFocused();
      expect(native.value).toBe(false);
    });

    test('discard closes the modal, restores the saved summary and focuses the Edit button', async ({ page }) => {
      const native = watchNativeDialog(page);
      const saved = await enterEdit(page, s);
      await s.dirty(page);
      await page.locator(s.cancel).click();
      await expect(modal(page)).toBeVisible();

      await page.locator('#settingsLeaveConfirmBtn').click();

      await expect(modal(page)).toBeHidden();
      await expect(page.locator(s.form)).toBeHidden();
      await expect(page.locator(s.summary)).toHaveText(saved);
      await expect(page.locator(s.edit)).toBeFocused();
      expect(native.value).toBe(false);
    });
  });
}

for (const s of SECTIONS.filter((x) => x.slug === 'review' || x.slug === 'labeling')) {
  test.describe(`settings cancel confirm extras: ${s.slug} (FR-026 (2), #1214)`, () => {
    test('Escape keeps editing: modal closed, edit kept', async ({ page }) => {
      const native = watchNativeDialog(page);
      await enterEdit(page, s);
      await s.dirty(page);
      await page.locator(s.cancel).click();
      await expect(modal(page)).toBeVisible();

      await page.keyboard.press('Escape');

      await expect(modal(page)).toBeHidden();
      await expect(page.locator(s.form)).toBeVisible();
      await s.expectEdited(page);
      expect(native.value).toBe(false);
    });

    test('Cancel on a clean form leaves edit mode without any modal', async ({ page }) => {
      const native = watchNativeDialog(page);
      await enterEdit(page, s);

      await page.locator(s.cancel).click();

      await expect(modal(page)).toBeHidden();
      await expect(page.locator(s.form)).toBeHidden();
      expect(native.value).toBe(false);
    });

    test('English: the leave modal title reads "Discard unsaved changes?"', async ({ page }) => {
      await page.addInitScript(() => window.localStorage.setItem('labelsuite.lang', 'en'));
      const native = watchNativeDialog(page);
      await enterEdit(page, s);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await s.dirty(page);

      await page.locator(s.cancel).click();

      await expect(modal(page)).toBeVisible();
      await expect(page.locator('#settingsLeaveTitle')).toHaveText('Discard unsaved changes?');
      expect(native.value).toBe(false);
    });
  });
}
