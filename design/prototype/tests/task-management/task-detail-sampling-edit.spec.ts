import { test, expect } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';

test.describe('Task detail sampling edit state', () => {
  test('shows separated sampling section with view/edit mode', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);

    await expect(page.locator('#executionTitle')).toHaveText('任務狀態與執行控制');
    await expect(page.locator('#samplingTitle')).toHaveText('抽樣設定');

    const editBtn = page.locator('#samplingEditBtn');
    const saveBtn = page.locator('#samplingSaveBtn');
    const cancelBtn = page.locator('#samplingCancelBtn');

    await expect(editBtn).toBeVisible();
    await expect(editBtn).toBeEnabled();
    await expect(saveBtn).toBeHidden();
    await expect(cancelBtn).toBeHidden();
    await expect(page.locator('#samplingSummaryView')).toBeVisible();
    await expect(page.locator('#labelTrialRoundControl')).toHaveText('試標回合');
    await expect(page.locator('#valueTrialRoundControl')).not.toBeEmpty();
    await expect(page.locator('#samplingEditForm')).toHaveClass(/hidden/);

    // IAA_METHOD_ENUM dropdown removed (task-management-014 IAA strategy v2).
    await expect(page.locator('#iaaMethodSelect')).toHaveCount(0);
    await expect(page.locator('#targetAgreementInput')).toHaveCount(0);

    await editBtn.click();

    await expect(editBtn).toBeHidden();
    await expect(saveBtn).toBeVisible();
    await expect(cancelBtn).toBeVisible();
    await expect(page.locator('#samplingSummaryView')).toHaveClass(/hidden/);
    await expect(page.locator('#samplingEditForm')).not.toHaveClass(/hidden/);
    await expect(page.locator('#samplingValue')).toBeEnabled();
    await expect(page.locator('#samplingRoundInput')).toHaveCount(0);
    await expect(page.locator('#minAnnotatorsInput')).toBeEnabled();
    await expect(page.locator('#isolationToggle')).toBeEnabled();

    const firstRowFields = page.locator('#samplingEditForm .sampling-fields').first().locator('.field-group');
    await expect(firstRowFields).toHaveCount(2);
    await expect(firstRowFields.nth(0).locator('label')).toContainText('抽樣筆數');
    await expect(firstRowFields.nth(1).locator('label')).toContainText('最少標記者數');
    await expect(page.locator('#samplingValueHint')).toHaveClass(/tooltip-bubble/);
    await expect(page.locator('#samplingValueHint')).toHaveText('筆數需 >= 1 且 < 資料集總筆數');
    await expect(page.locator('#samplingValueHint')).toBeHidden();

    await page.locator('#samplingValueHelp').hover();
    await expect(page.locator('#samplingValueHint')).toBeVisible();

    // T001 (default seed) has a single `single_label` output — one read-only
    // registry-driven row with an editable target-agreement input.
    const iaaRows = page.locator('#samplingIaaEditRows .sampling-iaa-type-row');
    await expect(iaaRows).toHaveCount(1);
    await expect(iaaRows.nth(0)).toContainText("Krippendorff's Alpha（nominal）");
    await expect(iaaRows.nth(0).locator('.iaa-override-input')).toHaveValue('0.80');

    const samplingBox = await firstRowFields.nth(0).boundingBox();
    const minAnnotatorsBox = await firstRowFields.nth(1).boundingBox();

    expect(samplingBox).not.toBeNull();
    expect(minAnnotatorsBox).not.toBeNull();
    expect(Math.abs((samplingBox?.y ?? 0) - (minAnnotatorsBox?.y ?? 0))).toBeLessThanOrEqual(2);
    expect(Math.abs(((samplingBox?.y ?? 0) + (samplingBox?.height ?? 0)) - ((minAnnotatorsBox?.y ?? 0) + (minAnnotatorsBox?.height ?? 0)))).toBeLessThanOrEqual(2);
  });

  test('renders one read-only IAA metric row per output type, sourced from OUTPUT_TYPE_IAA_REGISTRY', async ({ page }) => {
    // T010 = entity_recognition + relation_identification.
    await page.goto(`${TASK_DETAIL_URL}?task_id=T010`);

    const summaryRows = page.locator('#samplingIaaSummaryList .kv-dl-row');
    await expect(summaryRows).toHaveCount(2);
    await expect(summaryRows.nth(0)).toContainText('Span F1（嚴格）');
    await expect(summaryRows.nth(0)).toContainText('0.80');
    await expect(summaryRows.nth(1)).toContainText('Triple F1');
    await expect(summaryRows.nth(1)).toContainText('0.75');

    await page.locator('#samplingEditBtn').click();

    const iaaRows = page.locator('#samplingIaaEditRows .sampling-iaa-type-row');
    await expect(iaaRows).toHaveCount(2);
    await expect(iaaRows.nth(0)).toContainText('Span F1（嚴格）');
    await expect(iaaRows.nth(0).locator('.iaa-override-input')).toHaveValue('0.80');
    await expect(iaaRows.nth(1)).toContainText('Triple F1');
    await expect(iaaRows.nth(1).locator('.iaa-override-input')).toHaveValue('0.75');
  });

  test('shows not-applicable IAA state for free_text outputs with no override input', async ({ page }) => {
    // T009 = free_text only (no automatic IAA metric).
    await page.goto(`${TASK_DETAIL_URL}?task_id=T009`);

    const summaryRows = page.locator('#samplingIaaSummaryList .kv-dl-row');
    await expect(summaryRows).toHaveCount(1);
    await expect(summaryRows.nth(0)).toContainText('不適用');

    await page.locator('#samplingEditBtn').click();

    const iaaRows = page.locator('#samplingIaaEditRows .sampling-iaa-type-row');
    await expect(iaaRows).toHaveCount(1);
    await expect(iaaRows.nth(0)).toContainText('不適用');
    await expect(iaaRows.nth(0).locator('.iaa-override-input')).toHaveCount(0);
  });

  test('edits per-output-type target agreement override, validates 0..1 bounds, and persists on save', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T001`);
    await page.locator('#samplingEditBtn').click();

    const overrideInput = page.locator('#samplingIaaEditRows .iaa-override-input').first();
    await overrideInput.fill('0.85');
    await page.locator('#samplingSaveBtn').click();

    await expect(page.locator('#samplingIaaSummaryList .kv-dl-row').first()).toContainText('0.85');

    await page.locator('#samplingEditBtn').click();
    await page.locator('#samplingIaaEditRows .iaa-override-input').first().fill('1.5');
    await page.locator('#samplingSaveBtn').click();

    await expect(page.locator('#samplingError')).toHaveText('目標 IAA 需介於 0..1。');
    await expect(page.locator('#samplingError')).toHaveClass(/show/);
  });

  test('translates IAA metric labels and not-applicable text to English', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T009`);

    // #langToggle is in static markup but its listener binds only after every
    // tab panel fetch resolves; the summary row is rendered later still, so
    // waiting for it closes the click-before-bind race seen under CI load.
    await expect(page.locator('#samplingIaaSummaryList .kv-dl-row').first()).toContainText('不適用');

    await page.locator('#langToggle').click();

    await expect(page.locator('#samplingIaaSummaryList .kv-dl-row').first()).toContainText('Not applicable');

    await page.locator('#samplingEditBtn').click();
    await expect(page.locator('#samplingIaaEditRows .sampling-iaa-type-row').first()).toContainText('Not applicable');
  });
});
