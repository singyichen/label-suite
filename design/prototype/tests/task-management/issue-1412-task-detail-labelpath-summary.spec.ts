/*
 * Traceability: specs/task-management/014-task-detail/spec.md FR-014i-1, AC-3.85
 *   (openspec/changes/1412-task-detail-labelpath-summary), issue #1412.
 * Pins the read-only 標記設定 summary: a hierarchical taxonomy-tree output renders an indented
 * node list carrying each node's full LabelPath; flat outputs keep their comma-joined text.
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { openSettingsSection } from './_task-detail-settings-helpers';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html?task_role=project_leader';
const PANEL_LOAD_TIMEOUT = 15000;

// [name, depth, full path] in depth-first pre-order, T003 multi_label.label_options.
const T003_NODES: Array<[string, number, string]> = [
  ['情緒', 1, '情緒'],
  ['負向', 2, '情緒 › 負向'],
  ['悲傷', 3, '情緒 › 負向 › 悲傷'],
  ['焦慮', 3, '情緒 › 負向 › 焦慮'],
  ['正向', 2, '情緒 › 正向'],
  ['有盼望', 3, '情緒 › 正向 › 有盼望'],
  ['照護情境', 1, '照護情境'],
  ['臨床處置', 2, '照護情境 › 臨床處置'],
  ['緊急', 3, '照護情境 › 臨床處置 › 緊急'],
  ['康復', 2, '照護情境 › 康復'],
  ['後續追蹤', 3, '照護情境 › 康復 › 後續追蹤'],
  ['溝通', 2, '照護情境 › 溝通'],
  ['需要說明', 3, '照護情境 › 溝通 › 需要說明'],
];

async function openLabeling(page: Page, taskId: string, lang?: 'en') {
  if (lang) {
    await page.addInitScript((l) => window.localStorage.setItem('labelsuite.lang', l), lang);
  }
  await page.goto(`${TASK_DETAIL_URL}&task_id=${taskId}`);
  await expect(page.locator('#pageTitle')).not.toBeEmpty({ timeout: PANEL_LOAD_TIMEOUT });
  await openSettingsSection(page, 'labeling');
}

for (const lang of [undefined, 'en'] as const) {
  const suffix = lang ? ` (${lang})` : '';

  test(`T003 label summary lists every node with its LabelPath${suffix}`, async ({ page }) => {
    await openLabeling(page, 'T003', lang);
    const rows = page.locator('#settingsConfigDynamicRows .kv-dl-row');
    await expect(rows).toHaveCount(1);

    const tree = rows.first().getByTestId('settings-label-tree');
    await expect(tree).toHaveCount(1);
    const nodes = tree.getByTestId('settings-label-node');
    await expect(nodes).toHaveCount(T003_NODES.length);

    for (const [i, [name, depth, labelPath]] of T003_NODES.entries()) {
      const node = nodes.nth(i);
      await expect(node).toHaveText(name);
      await expect(node).toHaveAttribute('data-depth', String(depth));
      await expect(node).toHaveAttribute('data-label-path', labelPath);
    }

    // The tree is a read-only summary: no controls inside it.
    await expect(tree.locator('button, input, [role="checkbox"], [aria-expanded]')).toHaveCount(0);
  });

  test(`T003 label summary no longer shows only the comma-joined top level${suffix}`, async ({ page }) => {
    await openLabeling(page, 'T003', lang);
    const row = page.locator('#settingsConfigDynamicRows .kv-dl-row').first();
    await expect(row.getByTestId('settings-label-tree')).toHaveCount(1);
    await expect(row).not.toContainText('情緒, 照護情境');
  });
}

const FLAT_CASES: Array<[string, string]> = [
  ['T001', 'positive, neutral, negative'],
  ['T002', 'happy, sad, angry, surprise, fear, disgust'],
];

for (const [taskId, joined] of FLAT_CASES) {
  test(`flat ${taskId} keeps the comma-joined label summary and has no tree`, async ({ page }) => {
    await openLabeling(page, taskId);
    await expect(page.locator('#settingsConfigView')).toContainText(joined);
    await expect(page.getByTestId('settings-label-tree')).toHaveCount(0);
    await expect(page.getByTestId('settings-label-node')).toHaveCount(0);
  });
}
