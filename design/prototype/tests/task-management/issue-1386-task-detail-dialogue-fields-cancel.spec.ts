/*
 * Traceability: specs/task-management/014-task-detail/spec.md FR-014k-1, FR-014l-4
 *   (OpenSpec change task-detail-dialogue-fields: AC-3.80, AC-3.81, AC-3.82, AC-3.83, AC-3.84)
 *   specs/task-management/013-task-new/spec.md FR-002c-10
 * Issue #1386, tasks.md 2.1 (a-d), 3.1 and 4.1.
 *
 * Contract (dialogue demo task T013 + a non-dialogue guard T001):
 *   - Entering basic-info edit shows #inlineDialogueBlock with the stored mapping (AC-3.80).
 *   - Cancelling a dirty edit (cancel button or leaving the section, both through the in-page
 *     discard confirm) restores switch, mapping and auto title on re-entry (AC-3.82).
 *   - Saving writes TASK_DATA.dialogue_fields (updated mapping, or null when the proposal is
 *     declined); cancelling never changes the stored value (AC-3.81).
 *   - Labeling-settings edit previews a dialogue thread, one row per turn, without
 *     "[object Object]" or Output text (AC-3.84).
 */
import { test, expect } from '../fixtures';
import { openSettingsSection } from './_task-detail-settings-helpers';
import type { Page } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;
const DIALOGUE_TASK_ID = 'T013';
const PLAIN_TASK_ID = 'T001';
const STORED = { text: 'text', speaker: 'speaker', utt_id: 'utt_id', reply_to: 'reply_to' };

type DetailWindow = typeof window & { TASK_DATA: Record<string, unknown> };

const block = (page: Page) => page.getByTestId('dialogue-fields-block');
const toggle = (page: Page) => page.getByTestId('dialogue-fields-toggle');
const textSel = (page: Page) => page.getByTestId('dialogue-field-text');
const speakerSel = (page: Page) => page.getByTestId('dialogue-field-speaker');
const uttSel = (page: Page) => page.getByTestId('dialogue-field-utt-id');
const replySel = (page: Page) => page.getByTestId('dialogue-field-reply-to');
const titleSelect = (page: Page) => page.getByTestId('list-title-field-select');
const titleItems = (page: Page) => page.getByTestId('list-title-preview-item');

async function loadTask(page: Page, taskId: string) {
  await page.goto(`${TASK_DETAIL_URL}?task_role=project_leader&task_id=${taskId}&status=draft`);
  await expect(page.locator('#bcCurrent')).toHaveText(taskId, { timeout: PANEL_LOAD_TIMEOUT });
}

async function enterBasicEdit(page: Page) {
  await openSettingsSection(page, 'basic');
  const editBtn = page.locator('#overviewEditBtn');
  await expect(editBtn).toBeEnabled({ timeout: PANEL_LOAD_TIMEOUT });
  await editBtn.click();
  await expect(page.locator('#overviewEditForm')).not.toHaveClass(/hidden/);
  await expect(page.locator('.inline-dataset-preview-wrap')).toBeVisible({
    timeout: PANEL_LOAD_TIMEOUT,
  });
}

async function openBasicEdit(page: Page, taskId: string) {
  await loadTask(page, taskId);
  await enterBasicEdit(page);
}

async function readDialogueFields(page: Page) {
  return page.evaluate(
    () => (window as DetailWindow).TASK_DATA.dialogue_fields as Record<string, unknown> | null | undefined,
  );
}

/** First-turn summaries computed from the seed profile via the canonical FR-106 helper. */
async function canonicalTexts(page: Page, taskId: string, useDialogueFields: boolean) {
  return page.evaluate(
    ({ id, useDf }) => {
      const w = window as unknown as {
        LabelSuiteTaskDetailData: { profiles: Record<string, any> };
        LabelSuiteAnnotationWorkspaceData: { getRecordSummaryText: (...a: unknown[]) => string };
      };
      const profile = w.LabelSuiteTaskDetailData.profiles[id];
      return profile.datasetRecords.map((r: unknown) =>
        w.LabelSuiteAnnotationWorkspaceData.getRecordSummaryText(
          r,
          profile.fieldRoleMap,
          null,
          'zh',
          useDf ? profile.dialogue_fields : null,
        ),
      ) as string[];
    },
    { id: taskId, useDf: useDialogueFields },
  );
}

async function expectStoredBlock(page: Page) {
  await expect(block(page)).toBeVisible();
  await expect(toggle(page)).toBeChecked();
  await expect(textSel(page)).toHaveValue(STORED.text);
  await expect(speakerSel(page)).toHaveValue(STORED.speaker);
  await expect(uttSel(page)).toHaveValue(STORED.utt_id);
  await expect(replySel(page)).toHaveValue(STORED.reply_to);
}

async function expectAutoTitleIsFirstTurn(page: Page) {
  await expect(titleSelect(page)).toHaveValue('');
  const expected = await canonicalTexts(page, DIALOGUE_TASK_ID, true);
  expect(expected[0].length).toBeGreaterThan(0);
  await expect(titleItems(page).nth(0)).toHaveText(expected[0]);
  await expect(titleItems(page).nth(0)).not.toHaveText(/^\d+\s*(筆資料|records?)$/);
}

/** Dirty the edit: change a mapping, then switch the proposal off. */
async function dirtyDialogueEdit(page: Page) {
  await speakerSel(page).selectOption('');
  await toggle(page).uncheck();
  await expect(toggle(page)).not.toBeChecked();
  await expect(titleItems(page).nth(0)).toHaveText(/^\d+\s*(筆資料|records?)$/);
}

test.describe('Issue #1386 — load into edit mode (AC-3.80, tasks 2.1a)', () => {
  test('dialogue task edit mode shows the confirm block with the stored mapping', async ({ page }) => {
    await openBasicEdit(page, DIALOGUE_TASK_ID);
    await expectStoredBlock(page);
  });
});

test.describe('Issue #1386 — cancel restores stored dialogue_fields (AC-3.82, tasks 2.1b/c)', () => {
  test('(b) cancel button + discard confirm: re-entry shows switch on, stored mapping, first-turn title', async ({
    page,
  }) => {
    await openBasicEdit(page, DIALOGUE_TASK_ID);
    await dirtyDialogueEdit(page);

    await page.locator('#overviewCancelBtn').click();
    await page.locator('#settingsLeaveConfirmBtn').click();
    await expect(page.locator('#overviewEditForm')).toHaveClass(/hidden/);

    await page.locator('#overviewEditBtn').click();
    await expect(page.locator('#overviewEditForm')).not.toHaveClass(/hidden/);
    await expectStoredBlock(page);
    await expectAutoTitleIsFirstTurn(page);
  });

  test('(c) leaving the section through the discard confirm gives the same result', async ({
    page,
  }) => {
    await openBasicEdit(page, DIALOGUE_TASK_ID);
    await dirtyDialogueEdit(page);

    await page.locator('#settingsTab-labeling').click();
    await page.locator('#settingsLeaveConfirmBtn').click();
    await expect(page.locator('#settingsTab-labeling')).toHaveAttribute('aria-selected', 'true');

    await enterBasicEdit(page);
    await expectStoredBlock(page);
    await expectAutoTitleIsFirstTurn(page);
  });
});

test.describe('Issue #1386 — non-dialogue guard (tasks 2.1d)', () => {
  test('non-dialogue task shows no confirm block and keeps dialogue_fields empty', async ({ page }) => {
    await openBasicEdit(page, PLAIN_TASK_ID);
    await expect(block(page)).toHaveCount(0);
    expect(await readDialogueFields(page)).toBeFalsy();

    await page.locator('#overviewCancelBtn').click();
    await expect(page.locator('#overviewEditForm')).toHaveClass(/hidden/);
    await page.locator('#overviewEditBtn').click();
    await expect(block(page)).toHaveCount(0);
    const expected = await canonicalTexts(page, PLAIN_TASK_ID, false);
    await expect(titleItems(page).nth(0)).toHaveText(expected[0]);
  });
});

test.describe('Issue #1386 — save writes dialogue_fields (AC-3.81, tasks 3.1)', () => {
  test('changing the mapping and saving stores the updated mapping; re-entry shows it', async ({
    page,
  }) => {
    await openBasicEdit(page, DIALOGUE_TASK_ID);
    await speakerSel(page).selectOption('');
    await page.locator('#overviewSaveBtn').click();
    await expect(page.locator('#overviewEditForm')).toHaveClass(/hidden/);

    expect(await readDialogueFields(page)).toEqual({ ...STORED, speaker: null });

    await page.locator('#overviewEditBtn').click();
    await expect(toggle(page)).toBeChecked();
    await expect(speakerSel(page)).toHaveValue('');
    await expect(uttSel(page)).toHaveValue(STORED.utt_id);
  });

  test('declining the proposal and saving stores null', async ({ page }) => {
    await openBasicEdit(page, DIALOGUE_TASK_ID);
    await toggle(page).uncheck();
    await page.locator('#overviewSaveBtn').click();
    await expect(page.locator('#overviewEditForm')).toHaveClass(/hidden/);

    expect(await readDialogueFields(page)).toBeNull();
  });

  test('cancelling an edit does not change the stored dialogue_fields', async ({ page }) => {
    await openBasicEdit(page, DIALOGUE_TASK_ID);
    await speakerSel(page).selectOption('');
    await page.locator('#overviewCancelBtn').click();
    await page.locator('#settingsLeaveConfirmBtn').click();
    await expect(page.locator('#overviewEditForm')).toHaveClass(/hidden/);

    expect(await readDialogueFields(page)).toEqual(STORED);
  });
});

test.describe('Issue #1386 — labeling settings preview (AC-3.84, tasks 4.1)', () => {
  async function openLabelingEdit(page: Page, taskId: string) {
    await loadTask(page, taskId);
    await openSettingsSection(page, 'labeling');
    await expect(page.locator('#settingsEditBtn')).toBeEnabled({ timeout: PANEL_LOAD_TIMEOUT });
    await page.locator('#settingsEditBtn').click();
    await expect(page.locator('#settingsEditForm')).not.toHaveClass(/hidden/);
  }

  test('dialogue task previews one thread row per turn with id, speaker and text', async ({ page }) => {
    await openLabelingEdit(page, DIALOGUE_TASK_ID);
    // T013 is a seq_tagging task: its integrated preview renders the thread rows directly.
    const form = page.locator('#settingsEditForm');
    const rows = form.getByTestId('dialogue-thread-row');
    const turns = await page.evaluate(
      (id) =>
        (window as any).LabelSuiteTaskDetailData.profiles[id].datasetRecords[0].utterances.length as number,
      DIALOGUE_TASK_ID,
    );
    expect(turns).toBeGreaterThan(1);
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBe(turns);
    await expect(rows.nth(0).getByTestId('dialogue-utt-id')).not.toBeEmpty();
    await expect(rows.nth(0).getByTestId('dialogue-speaker')).not.toBeEmpty();
    await expect(rows.nth(0).getByTestId('dialogue-text')).not.toBeEmpty();
    await expect(page.locator('#settingsEditForm')).not.toContainText('[object Object]');
    await expect(form).not.toContainText('gold_triplets');
    await expect(form).not.toContainText('incomplete_annotations');
  });

  test('non-dialogue task has no dialogue thread preview', async ({ page }) => {
    await openLabelingEdit(page, PLAIN_TASK_ID);
    await expect(page.locator('#settingsEditForm').getByTestId('dialogue-thread-row')).toHaveCount(0);
    await expect(page.locator('#settingsEditForm')).not.toContainText('[object Object]');
  });
});
