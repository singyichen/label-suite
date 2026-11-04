/*
 * Traceability: specs/task-management/013-task-new/spec.md FR-002c-9
 *   specs/task-management/014-task-detail/spec.md FR-014k (isomorphic with 013)
 *   specs/annotation/015-annotation-workspace/spec.md FR-106 (canonical record summary)
 * Issue #1386: in task-detail settings edit mode with list title on "auto", a
 * dialogue task (Input is an object array) previewed "N 筆資料" because task-detail
 * never loaded the task's stored `dialogue_fields` into state.dialogueFields.
 *
 * Contract:
 *   - Dialogue task: each auto item text === getRecordSummaryText(record, fieldRoleMap,
 *     null, lang, dialogue_fields) (first dialogue turn), never the count text.
 *   - Non-dialogue task (no dialogue_fields): auto preview unchanged.
 */
import { test, expect } from '../fixtures';
import { openSettingsSection } from './_task-detail-settings-helpers';
import type { Page } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;
const DIALOGUE_TASK_ID = 'T013';
const PLAIN_TASK_ID = 'T001';

const select = (page: Page) => page.getByTestId('list-title-field-select');
const items = (page: Page) => page.getByTestId('list-title-preview-item');

async function openBasicEdit(page: Page, taskId: string) {
  await page.goto(`${TASK_DETAIL_URL}?task_role=project_leader&task_id=${taskId}&status=draft`);
  await expect(page.locator('#bcCurrent')).toHaveText(taskId, { timeout: PANEL_LOAD_TIMEOUT });
  await openSettingsSection(page, 'basic');
  const editBtn = page.locator('#overviewEditBtn');
  await expect(editBtn).toBeEnabled({ timeout: PANEL_LOAD_TIMEOUT });
  await editBtn.click();
  await expect(page.locator('#overviewEditForm')).not.toHaveClass(/hidden/);
  await expect(page.locator('.inline-dataset-preview-wrap')).toBeVisible({
    timeout: PANEL_LOAD_TIMEOUT,
  });
}

/** Canonical summaries computed in-page from the seed profile of `taskId`. */
async function canonicalFromProfile(page: Page, taskId: string, useDialogueFields: boolean) {
  return page.evaluate(
    ({ id, useDf }) => {
      const w = window as unknown as {
        LabelSuiteTaskDetailData?: { profiles: Record<string, any> };
        LabelSuiteAnnotationWorkspaceData?: { getRecordSummaryText: (...a: unknown[]) => string };
      };
      const profile = w.LabelSuiteTaskDetailData?.profiles?.[id];
      const api = w.LabelSuiteAnnotationWorkspaceData;
      if (!profile || !api) return null;
      return {
        hasDialogueFields: !!profile.dialogue_fields,
        texts: profile.datasetRecords.map((r: unknown) =>
          api.getRecordSummaryText(
            r,
            profile.fieldRoleMap,
            null,
            'zh',
            useDf ? profile.dialogue_fields : null,
          ),
        ) as string[],
      };
    },
    { id: taskId, useDf: useDialogueFields },
  );
}

test.describe('Issue #1386 — task-detail dialogue task auto list title (FR-014k, 015 FR-106)', () => {
  test('auto items equal the canonical first-dialogue-turn summary, not the count text', async ({
    page,
  }) => {
    await openBasicEdit(page, DIALOGUE_TASK_ID);
    await expect(select(page)).toHaveValue('');

    const expected = await canonicalFromProfile(page, DIALOGUE_TASK_ID, true);
    expect(expected, 'profile and getRecordSummaryText must be loaded').not.toBeNull();
    expect(expected!.hasDialogueFields).toBe(true);
    expect(expected!.texts[0].length).toBeGreaterThan(0);

    const count = await items(page).count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(count, expected!.texts.length); i++) {
      await expect(items(page).nth(i)).toHaveText(expected!.texts[i]);
      await expect(items(page).nth(i)).not.toHaveText(/^\d+\s*(筆資料|records?)$/);
    }
  });
});

test.describe('Issue #1386 — regression guard (must keep passing)', () => {
  test('non-dialogue task auto items still equal the canonical summary with null dialogue fields', async ({
    page,
  }) => {
    await openBasicEdit(page, PLAIN_TASK_ID);
    await expect(select(page)).toHaveValue('');

    const expected = await canonicalFromProfile(page, PLAIN_TASK_ID, false);
    expect(expected, 'profile and getRecordSummaryText must be loaded').not.toBeNull();
    expect(expected!.hasDialogueFields).toBe(false);

    // the preview renders only the first few records
    const count = await items(page).count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(count, expected!.texts.length); i++) {
      await expect(items(page).nth(i)).toHaveText(expected!.texts[i]);
    }
  });
});
