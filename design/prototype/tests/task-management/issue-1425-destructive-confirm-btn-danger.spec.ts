/*
 * Traceability: issue #1425; design/system/MASTER.md §Modals (v1.32) — a destructive confirmation
 * uses the solid Danger variant `.btn-danger` in the primary (rightmost) position.
 * Shared rule lives in pages/shared/modal.css.
 *
 * TDD Red. Contract:
 *   - task-list #deleteTaskConfirmBtn:        `btn btn-danger` (no mini-btn classes)
 *   - task-detail #settingsLeaveConfirmBtn:   `btn btn-danger` (leaving discards unsaved edits)
 *   - task-detail #riskConfirmBtn:            stays `btn btn-primary` (acknowledgement, not destructive)
 *   - pages/shared/modal.css defines `.btn-danger`
 *   - opened through the real UI, the destructive confirm has a computed background equal to
 *     --color-error and is the last button in its .modal-actions.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { openSettingsSection } from './_task-detail-settings-helpers';

const PROTO = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(PROTO, rel), 'utf8');
const LIST_URL = '/pages/task-management/task-list.html?task_role=project_leader';
const DETAIL_URL = '/pages/task-management/task-detail.html?task_role=project_leader&task_id=T001';

function classesOf(html: string, id: string): string[] {
  const m = html.match(new RegExp(`<button\\b[^>]*\\bid="${id}"[^>]*>`));
  expect(m, `#${id} must exist in source`).not.toBeNull();
  const c = m![0].match(/\bclass="([^"]*)"/);
  return c ? c[1].split(/\s+/).filter(Boolean) : [];
}

/** Resolve --color-error to a computed rgb() value via a probe element. */
async function errorTokenColor(page: Page): Promise<string> {
  return page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.backgroundColor = 'var(--color-error)';
    document.body.appendChild(probe);
    const v = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return v;
  });
}

async function expectSolidDangerPrimary(page: Page, modalSel: string, confirmSel: string) {
  const confirm = page.locator(confirmSel);
  await expect(confirm).toHaveClass(/(^|\s)btn-danger(\s|$)/);
  const bg = await confirm.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  expect(bg).not.toBe('transparent');
  expect(bg).toBe(await errorTokenColor(page));
  const lastId = await page
    .locator(`${modalSel} .modal-actions`)
    .evaluate((el) => (el.querySelector('button:last-of-type') as HTMLElement).id);
  expect(lastId).toBe(confirmSel.slice(1));
}

test.describe('destructive confirm uses btn-danger: static (#1425)', () => {
  test('task-list #deleteTaskConfirmBtn is btn btn-danger without mini-btn classes', () => {
    const c = classesOf(read('pages/task-management/task-list.html'), 'deleteTaskConfirmBtn');
    expect(c).toEqual(expect.arrayContaining(['btn', 'btn-danger']));
    expect(c.some((x) => x.startsWith('mini-btn'))).toBe(false);
  });

  test('task-detail #settingsLeaveConfirmBtn is btn btn-danger', () => {
    const c = classesOf(read('pages/task-management/task-detail.html'), 'settingsLeaveConfirmBtn');
    expect(c).toEqual(expect.arrayContaining(['btn', 'btn-danger']));
    expect(c).not.toContain('btn-primary');
  });

  test('task-detail #riskConfirmBtn stays btn btn-primary (guard: not destructive)', () => {
    const c = classesOf(read('pages/task-management/task-detail.html'), 'riskConfirmBtn');
    expect(c).toEqual(expect.arrayContaining(['btn', 'btn-primary']));
    expect(c).not.toContain('btn-danger');
  });

  test('pages/shared/modal.css defines .btn-danger', () => {
    expect(read('pages/shared/modal.css')).toMatch(/\.btn-danger\s*[{,:]/);
  });
});

test.describe('destructive confirm uses btn-danger: computed (#1425)', () => {
  test('task-list delete modal: solid danger confirm in primary position', async ({ page }) => {
    await page.goto(LIST_URL);
    const draftRow = page.locator('#taskTableBody tr[data-source-file="single-label.json"]');
    await draftRow.getByRole('button', { name: '刪除' }).click();
    await expect(page.locator('#deleteTaskModal')).toBeVisible();
    await expectSolidDangerPrimary(page, '#deleteTaskModal', '#deleteTaskConfirmBtn');
  });

  test('task-detail settings-leave modal: solid danger confirm in primary position', async ({ page }) => {
    await page.goto(DETAIL_URL);
    await openSettingsSection(page, 'basic');
    await expect(page.locator('#overviewEditBtn')).toBeEnabled({ timeout: 15000 });
    await page.locator('#overviewEditBtn').click();
    await page.locator('#editTaskNameInput').fill('Edited task name 1425');
    await page.locator('#overviewCancelBtn').click();
    await expect(page.locator('#settingsLeaveModal')).toBeVisible();
    await expectSolidDangerPrimary(page, '#settingsLeaveModal', '#settingsLeaveConfirmBtn');
  });
});
