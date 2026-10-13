/*
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   FR-014a, FR-014g, FR-014l (issue #1215; guards 07b61ce6 from #1199 G2)
 *
 * Regression: changing ONLY a field role in the basic-info edit form must not
 * rewrite the saved item-pair labels. saveOverviewEdit() runs renderSchemaFields()
 * before reading labels; because the role map is part of the auto-population key,
 * that call resets the labels, and only the one-shot _pendingItemPairLabels seed
 * restores the saved custom ones. Mutation-checked: nulling that restore in
 * task-config.engine.js fails tests 1 and 2. Removing the renderSchemaFields() call
 * in saveOverviewEdit is NOT detectable on a role-map-only edit (state keeps the
 * labels either way); that line is guarded by the dataset-replacement test in
 * task-detail-task-profiles.spec.ts.
 *
 * Save path hit: saveOverviewEdit (basic-info section). The role-map select only
 * exists in the basic-info dataset preview, so saveSettingsEdit is not reached by a
 * role-map change; it is exercised here only to seed the custom labels.
 */
import { test, expect } from '../fixtures';
import { openSettingsSection } from './_task-detail-settings-helpers';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html?task_role=project_leader&task_id=T011';
const PANEL_LOAD_TIMEOUT = 15000;
/* Differ from the dataset-column-derived defaults (Premise / Hypothesis) */
const CUSTOM_LABELS = ['前提句', '假設句'];

async function seedCustomLabels(page: import('@playwright/test').Page) {
  await openSettingsSection(page, 'labeling');
  await expect(page.locator('#statusBadge')).toContainText('草稿', { timeout: PANEL_LOAD_TIMEOUT });
  await page.locator('#settingsEditBtn').click();
  await page.getByTestId('item-pair-label-input-1').fill(CUSTOM_LABELS[0]);
  await page.getByTestId('item-pair-label-input-2').fill(CUSTOM_LABELS[1]);
  await page.locator('#settingsSaveBtn').click();
  await expect(page.locator('#settingsEditForm')).toHaveClass(/hidden/);
}

async function expectLabelsInSettingsEdit(page: import('@playwright/test').Page, labels: string[]) {
  await openSettingsSection(page, 'labeling');
  await page.locator('#settingsEditBtn').click();
  await expect(page.getByTestId('item-pair-labels-card')).toBeVisible();
  await expect(page.getByTestId('item-pair-label-input-1')).toHaveValue(labels[0]);
  await expect(page.getByTestId('item-pair-label-input-2')).toHaveValue(labels[1]);
}

test.describe('Task detail: role-map-only edit keeps saved item-pair labels (#1215)', () => {
  test('changing only a field role in basic-info edit leaves custom labels unchanged', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await seedCustomLabels(page);
    const savedBefore = await page.evaluate(() => JSON.stringify((window.TASK_DATA as any)?.itemPairLabels ?? null));
    expect(JSON.parse(savedBefore)).toEqual(CUSTOM_LABELS);

    /* Change ONLY the role of an unrelated metadata column: Input columns (and so the
       derived defaults) stay the same, but the role map key changes. */
    await openSettingsSection(page, 'basic');
    await page.locator('#overviewEditBtn').click();
    const titleRole = page.getByRole('combobox', { name: '角色：Title' });
    await expect(titleRole).toHaveValue('');
    await titleRole.selectOption('evidence');
    await page.locator('#overviewSaveBtn').click();
    await expect(page.locator('#overviewEditForm')).toHaveClass(/hidden/);

    /* The role map really changed... */
    const roleMap = await page.evaluate(() => (window.TASK_DATA as any)?.fieldRoleMap ?? {});
    expect(roleMap).toMatchObject({ Title: 'evidence', Premise: 'input', Hypothesis: 'input' });
    /* ...and the saved labels did not */
    const savedAfter = await page.evaluate(() => (window.TASK_DATA as any)?.itemPairLabels ?? null);
    expect(savedAfter).toEqual(CUSTOM_LABELS);

    /* Reopening the settings edit form shows the same labels */
    await expectLabelsInSettingsEdit(page, CUSTOM_LABELS);
  });

  test('labels survive a second basic-info edit session that changes only the role map', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await seedCustomLabels(page);

    await openSettingsSection(page, 'basic');
    await page.locator('#overviewEditBtn').click();
    await page.getByRole('combobox', { name: '角色：Title' }).selectOption('evidence');
    await page.locator('#overviewSaveBtn').click();
    await expect(page.locator('#overviewEditForm')).toHaveClass(/hidden/);

    await page.locator('#overviewEditBtn').click();
    await page.getByRole('combobox', { name: '角色：Title' }).selectOption('');
    await page.locator('#overviewSaveBtn').click();
    await expect(page.locator('#overviewEditForm')).toHaveClass(/hidden/);

    await expectLabelsInSettingsEdit(page, CUSTOM_LABELS);
  });

  test('reload re-seeds the prototype in-memory task data (derived defaults, not custom labels)', async ({ page }) => {
    /* The prototype keeps TASK_DATA in memory only: reload proves the page re-seeds
       cleanly from the static seed, it cannot prove persistence of the custom labels. */
    await page.goto(TASK_DETAIL_URL);
    await seedCustomLabels(page);
    await page.reload();
    await expectLabelsInSettingsEdit(page, ['Premise', 'Hypothesis']);
  });
});
