import { test, expect } from '@playwright/test';

const TASK_NEW_URL = '/pages/task-management/task-new.html';

test.describe('Issue #755 — Step 1 field role Input name hints', () => {
  test('exposes a config-driven FIELD_ROLE_INPUT_NAME_HINTS array of non-empty strings including "text"', async ({ page }) => {
    await page.goto(TASK_NEW_URL);

    const hints = await page.evaluate(() => {
      const win = window as typeof window & { FIELD_ROLE_INPUT_NAME_HINTS?: string[] };
      return win.FIELD_ROLE_INPUT_NAME_HINTS;
    });

    expect(Array.isArray(hints)).toBe(true);
    expect(hints!.length).toBeGreaterThanOrEqual(1);
    for (const hint of hints!) {
      expect(typeof hint).toBe('string');
      expect(hint.length).toBeGreaterThan(0);
    }
    expect(hints).toContain('text');
  });
});

/* Traceability: specs/task-management/013-task-new/spec.md
 *   FR-002c-8, AC-1.6, AC-1.7
 * `renderInlineDatasetPreview()` must auto-fill Input for columns whose name
 * matches a FIELD_ROLE_INPUT_NAME_HINTS keyword, but only for columns that
 * have never been assigned a role — manual choices and FR-002c-4 record-source
 * memory always win over the hint. */

type WindowWithFieldRoleState = typeof window & { state: { fieldRoleMap: Record<string, string> } };

async function setupTaskWithInlineDataset(
  page: import('@playwright/test').Page,
  dataset: unknown,
  fileName: string,
  inputType?: string,
) {
  await page.goto(TASK_NEW_URL, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.querySelectorAll('#taskCategoryChips [data-key]').length > 0,
    null,
    { timeout: 30000 },
  );
  await page.fill('#taskNameInput', 'issue-755-field-role-hints');
  await page.locator('#taskCategoryChips [data-key="classification"]').click();
  if (inputType) {
    await page.locator(`#taskInputTypeChips [data-key="${inputType}"]`).click();
  }
  await page.locator('#taskOutputTypeChips [data-key="single_label"]').click();
  await page.locator('#datasetFileInput').setInputFiles({
    name: fileName,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(dataset)),
  });
  await expect(page.locator('.inline-dataset-preview-wrap')).toBeVisible();
}

async function getFieldRoleMap(page: import('@playwright/test').Page): Promise<Record<string, string>> {
  return page.evaluate(() => (window as WindowWithFieldRoleState).state.fieldRoleMap);
}

test.describe('Issue #755 — Step 1 Input role hint inference (FR-002c-8)', () => {
  test('infers Input for the single hint-matching column, leaving non-matching columns unused', async ({
    page,
  }) => {
    await setupTaskWithInlineDataset(
      page,
      [
        { id: 'r1', text: 'first row text content', label: 'pos' },
        { id: 'r2', text: 'second row text content', label: 'neg' },
      ],
      'issue-755-single-hint-match.json',
    );

    const map = await getFieldRoleMap(page);
    expect(map.text).toBe('input');
    expect(map.id).not.toBe('input');
    expect(map.label).not.toBe('input');
  });

  test('assigns Input only to the first hint-matching column in original column order under the single_item cap', async ({
    page,
  }) => {
    await setupTaskWithInlineDataset(
      page,
      [
        { text: 'first row text', content: 'first row content', sentence: 'first row sentence' },
        { text: 'second row text', content: 'second row content', sentence: 'second row sentence' },
      ],
      'issue-755-multi-hint-match.json',
      'single_item',
    );

    const map = await getFieldRoleMap(page);
    expect(map.text).toBe('input');
    expect(map.content).not.toBe('input');
    expect(map.sentence).not.toBe('input');
  });

  test('keeps a manually assigned role after the dataset re-initializes via a record-source switch', async ({
    page,
  }) => {
    await setupTaskWithInlineDataset(
      page,
      {
        records: [
          { id: 'r1', text: 'alpha row text one', label: 'pos' },
          { id: 'r2', text: 'alpha row text two', label: 'neg' },
        ],
        altRecords: [
          { id: 'r3', text: 'beta row text one', label: 'neu' },
          { id: 'r4', text: 'beta row text two', label: 'neu' },
        ],
      },
      'issue-755-source-switch.json',
    );

    // Manually override the role to a value hint inference must never touch
    await page.locator('.inline-preview-role-select[aria-label*="text"]').selectOption('evidence');

    // Re-trigger initialization of the same dataset by switching the record
    // source away and back (FR-002c-4 per-source role memory round trip)
    const sourceSelect = page.locator('.inline-preview-source-select');
    await sourceSelect.selectOption('$.altRecords');
    await sourceSelect.selectOption('$.records');

    const map = await getFieldRoleMap(page);
    expect(map.text).toBe('evidence');
  });
});
