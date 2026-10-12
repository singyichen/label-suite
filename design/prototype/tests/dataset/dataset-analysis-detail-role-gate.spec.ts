import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

/* Issue #1267: dataset-analysis-detail must enforce the FR-003 / AC-1.4 role
 * gate (TASK_ROLES_ALLOWED = project_leader | reviewer), carry an explicit
 * task_role on outbound task-detail links, and stop labelling the merged
 * aggregate reference value as "Gold" (spec 017: not ground truth).
 *
 * TASK_META has no annotator task, so the annotator case is simulated by
 * rewriting T001's membershipRole in the served detail HTML. */

const DETAIL_URL = '/pages/dataset/dataset-analysis-detail.html';
const INVALID_TOAST = '找不到指定的任務，或您沒有該任務的存取權限。';

async function rewriteT001Role(page: Page, mode: string | null) {
  await page.route(/dataset-analysis-detail\.html/, async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    const body = html.replace(
      /(T001: \{[\s\S]*?)\n\s*membershipRole: '[a-z_]+',/,
      (_m, head: string) =>
        mode === null ? head : `${head}\n    membershipRole: '${mode}',`,
    );
    await route.fulfill({ response, body });
  });
}

/* The list page deliberately strips invalid_task from the address bar after
 * reading it (issue #261), so the marker is asserted on the redirect
 * navigation request itself rather than on the settled URL. */
function waitForInvalidTaskRedirect(page: Page) {
  return page.waitForRequest(
    (req) =>
      req.isNavigationRequest() &&
      /\/pages\/dataset\/dataset-analysis-list\.html\?(.*&)?invalid_task=1(&|$)/.test(req.url()),
  );
}

async function expectRedirectedToListWithErrorToast(page: Page) {
  await expect(page).toHaveURL(/\/pages\/dataset\/dataset-analysis-list\.html/);
  await expect(page).not.toHaveURL(/dataset-analysis-detail\.html/);
  const toast = page.locator('#toast');
  await expect(toast).toHaveClass(/toast-error/);
  await expect(toast).toHaveClass(/visible/);
  await expect(page.locator('#toastMsg')).toHaveText(INVALID_TOAST);
}

test.describe('dataset-analysis-detail role gate (issue #1267, AC-1.4 / FR-003)', () => {
  for (const [label, role] of [
    ['annotator', 'annotator'],
    ['unknown value', 'observer'],
    ['missing value', null],
  ] as const) {
    test(`membershipRole ${label} is redirected to the list with an error toast`, async ({ page }) => {
      await rewriteT001Role(page, role);
      const redirect = waitForInvalidTaskRedirect(page);
      await page.goto(`${DETAIL_URL}?task_id=T001`, { waitUntil: 'commit' });
      await redirect;
      await expectRedirectedToListWithErrorToast(page);
    });
  }

  test('reviewer task T002 still opens the detail page (regression guard)', async ({ page }) => {
    await page.goto(`${DETAIL_URL}?task_id=T002`);
    await expect(page).toHaveURL(/dataset-analysis-detail\.html\?task_id=T002/);
    await expect(page).not.toHaveURL(/invalid_task/);
    await expect(page.locator('#bcCurrent')).toBeVisible();
  });

  test('project_leader task T001 still opens the detail page (regression guard)', async ({ page }) => {
    await page.goto(`${DETAIL_URL}?task_id=T001`);
    await expect(page).toHaveURL(/dataset-analysis-detail\.html\?task_id=T001/);
    await expect(page).not.toHaveURL(/invalid_task/);
    await expect(page.locator('#bcCurrent')).toBeVisible();
  });
});

test.describe('boundary example wording avoids "Gold" (issue #1267, spec 017 merged aggregate reference)', () => {
  const cases = [
    { type: 'entity_recognition', taskId: 'T007', key: 'entityRecognitionListRank.boundaryExampleDetail' },
    { type: 'sequence_tagging', taskId: 'T006', key: 'sequenceTaggingListRank.boundaryExampleDetail' },
  ];
  for (const { type, taskId, key } of cases) {
    for (const lang of ['zh', 'en'] as const) {
      test(`${type} (${taskId}) ${lang}: no "Gold", uses reference wording`, async ({ page }) => {
        await page.addInitScript((l) => {
          window.localStorage.setItem('labelsuite.lang', l);
        }, lang);
        await page.goto(`${DETAIL_URL}?task_id=${taskId}&tab=quality`);
        const example = page.locator(`[data-i18n="${key}"]`);
        await expect(example).toHaveCount(1);
        await expect(example).not.toContainText('Gold');
        await expect(example).toContainText(lang === 'zh' ? '參考值' : 'Reference');
        const pageText = await page.locator('body').innerText();
        expect(pageText).not.toContain('Gold');
      });
    }
  }
});

test.describe('outbound task-detail links carry explicit task_role (issue #1267)', () => {
  test('risk table 調整參與狀態 on T104 (project_leader) passes task_role=project_leader', async ({ page }) => {
    await page.goto(`${DETAIL_URL}?task_id=T104&tab=quality`);
    const adjustBtn = page.locator('.risk-action-btn[data-i18n="qualityRisk.actionAdjust"]').first();
    await expect(adjustBtn).toBeEnabled();
    await adjustBtn.click();
    await expect(page).toHaveURL(/\/pages\/task-management\/task-detail\.html\?/);
    await expect(page).toHaveURL(/task_role=project_leader/);
  });

  const emptyCases = [
    { taskId: 'T002', role: 'reviewer' },
    { taskId: 'T001', role: 'project_leader' },
  ];
  for (const { taskId, role } of emptyCases) {
    test(`#statsEmptyBtn on ${taskId} carries task_role=${role}`, async ({ page }) => {
      await page.goto(`${DETAIL_URL}?task_id=${taskId}&s_state=empty`);
      const btn = page.locator('#statsEmptyBtn');
      await expect(btn).toBeVisible();
      await expect(btn).toHaveAttribute('href', new RegExp(`task_id=${taskId}`));
      await expect(btn).toHaveAttribute('href', new RegExp(`task_role=${role}`));
    });

    test(`#emptyBtn (quality empty state) on ${taskId} carries task_role=${role}`, async ({ page }) => {
      await page.goto(`${DETAIL_URL}?task_id=${taskId}&tab=quality&q_state=report_pending`);
      const btn = page.locator('#emptyBtn');
      await expect(btn).toBeVisible();
      await expect(btn).toHaveAttribute('href', new RegExp(`task_id=${taskId}`));
      await expect(btn).toHaveAttribute('href', new RegExp(`task_role=${role}`));
    });
  }
});
