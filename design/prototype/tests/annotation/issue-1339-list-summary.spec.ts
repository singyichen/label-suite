import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { buildListUrl, buildWorkspaceUrl, patchDataFile, skipGuidelineModal } from './_workspace-helpers';

/* issue #1339 (OpenSpec change annotation-list-summary-shared, RED): the
 * workspace left column (annotator item `.sample-snippet`, reviewer group
 * `ws-sample-group-snippet`, exception pool group
 * `ws-exception-sample-group-snippet`) and the annotation-list text column
 * (`.text-snippet-content`) must share ONE summary rule driven by the task
 * profile key `list_title_field`. Assertions use rendered DOM text only; the
 * helper's name is the implementer's choice.
 *
 * Injection: `list_title_field` is not set by any seed, so each test appends
 * a patch to task-detail.data.js (patchDataFile, route-level, applied to
 * every page that loads it) that mutates LabelSuiteTaskDetailData.profiles
 * right after the seed is defined, before page scripts read it.
 *
 * Language: `labelsuite.lang` in localStorage (see
 * annotation-workspace-i18n.spec.ts).
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md
 * FR-106, AC-1.35, AC-1.36, AC-1.37, SC-028 (openspec delta). */

const AUTO_T013 = '我入手Note 10 plus第三天就退廠保修 過熱問題嚴重！差評';
const SNIPPETS = '.sample-snippet, .text-snippet-content, [data-testid$="snippet"]';

type ProfilePatch = { tasks: string[]; listTitleField?: string | null; body?: string };

/* Adds an extra Input `headline` (value HEAD-<id>) and an extra Output
 * `secret_out` (value OUTSECRET-<id>) to the given tasks, then optionally
 * sets list_title_field and runs a free-form per-profile body. */
async function patchProfiles(page: Page, { tasks, listTitleField, body = '' }: ProfilePatch) {
  await patchDataFile(
    page,
    'task-detail.data.js',
    `
    var profiles = window.LabelSuiteTaskDetailData.profiles;
    ${JSON.stringify(tasks)}.forEach(function (taskId) {
      var p = profiles[taskId];
      p.fieldRoleMap.headline = 'input';
      p.fieldRoleMap.secret_out = 'output';
      p.datasetRecords.forEach(function (r) {
        r.headline = 'HEAD-' + r.id;
        r.secret_out = 'OUTSECRET-' + r.id;
      });
      ${listTitleField === undefined ? '' : `p.list_title_field = ${JSON.stringify(listTitleField)};`}
      ${body}
    });
    `
  );
}

async function annotatorSnippet(page: Page): Promise<string> {
  await page.goto(buildWorkspaceUrl({ task_id: 'T013', sample_id: 'absa-001' }));
  const item = page.getByTestId('ws-sample-item').first();
  await expect(item).toBeVisible();
  return ((await item.locator('.sample-snippet').textContent()) || '').replace(/\s+/g, ' ').trim();
}

async function listSnippet(page: Page): Promise<string> {
  await page.goto(buildListUrl({ task_id: 'T013' }));
  const row = page.getByTestId('ws-sample-item').filter({ hasText: 'absa-001' });
  await expect(row).toBeVisible();
  return ((await row.locator('.text-snippet-content').textContent()) || '').replace(/\s+/g, ' ').trim();
}

async function expectNoObjectObject(page: Page) {
  const texts = await page.locator(SNIPPETS).allTextContents();
  expect(texts.length).toBeGreaterThan(0);
  texts.forEach((t) => expect(t).not.toContain('[object Object]'));
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #1339: shared list summary (FR-106)', () => {
  test('AC-1.35: T013 auto mode shows the first utterance text, never [object Object]', async ({ page }) => {
    expect(await annotatorSnippet(page)).toBe(AUTO_T013);
    await expectNoObjectObject(page);
    expect(await listSnippet(page)).toBe(AUTO_T013);
    await expectNoObjectObject(page);
  });

  test('AC-1.36: list_title_field set to an Input field applies to all four surfaces', async ({ page }) => {
    await patchProfiles(page, { tasks: ['T013', 'T014', 'T016'], listTitleField: 'headline' });

    expect(await annotatorSnippet(page)).toBe('HEAD-absa-001');
    expect(await listSnippet(page)).toBe('HEAD-absa-001');

    await page.goto(buildWorkspaceUrl({ task_id: 'T014', sample_id: 'dry-01-all-agree', role: 'reviewer', run_type: 'dry_run' }));
    await expect(page.getByTestId('ws-sample-group-snippet').first()).toHaveText('HEAD-dry-01-all-agree');

    await page.goto(
      '/pages/annotation/annotation-workspace.html?task_id=T016&sample_id=ofm-05-final-exception&role=project_leader&run_type=official_run&annotator_id=kioleemg12'
    );
    await expect(page.getByTestId('ws-exception-sample-group-snippet')).toHaveText('HEAD-ofm-05-final-exception');
  });

  test('AC-1.36: list_title_field pointing at an Output field falls back to auto and never leaks Output', async ({ page }) => {
    await patchProfiles(page, { tasks: ['T013', 'T014', 'T016'], listTitleField: 'secret_out' });

    expect(await annotatorSnippet(page)).toBe(AUTO_T013);
    expect(await listSnippet(page)).toBe(AUTO_T013);

    await page.goto(buildWorkspaceUrl({ task_id: 'T014', sample_id: 'dry-01-all-agree', role: 'reviewer', run_type: 'dry_run' }));
    // T014 auto = its first Input field `text`, not the Output value.
    const group = (await page.getByTestId('ws-sample-group-snippet').first().textContent()) || '';
    expect(group).toContain('餐點份量十足');
    expect(group).not.toContain('OUTSECRET');
    await page.goto(
      '/pages/annotation/annotation-workspace.html?task_id=T016&sample_id=ofm-05-final-exception&role=project_leader&run_type=official_run&annotator_id=kioleemg12'
    );
    const pool = (await page.getByTestId('ws-exception-sample-group-snippet').textContent()) || '';
    expect(pool).not.toContain('OUTSECRET');
  });

  test('AC-1.37: object array without text fields -> "3 筆資料" / "3 items"', async ({ page }) => {
    await patchProfiles(page, {
      tasks: ['T013'],
      body: `p.fieldRoleMap = { utterances: 'input', text: 'input' };
             p.datasetRecords.forEach(function (r) { r.utterances = [{ a: 1 }, { a: 2 }, { a: 3 }]; r.text = ''; });`,
    });
    expect(await annotatorSnippet(page)).toBe('3 筆資料');
    expect(await listSnippet(page)).toBe('3 筆資料');

    await page.addInitScript(() => window.localStorage.setItem('labelsuite.lang', 'en'));
    expect(await annotatorSnippet(page)).toBe('3 items');
    expect(await listSnippet(page)).toBe('3 items');
  });

  test('AC-1.37: every Input value empty -> falls back to the record id', async ({ page }) => {
    await patchProfiles(page, {
      tasks: ['T013'],
      body: `p.fieldRoleMap = { utterances: 'input', text: 'input' };
             p.datasetRecords.forEach(function (r) { r.utterances = []; r.text = ''; });`,
    });
    expect(await annotatorSnippet(page)).toBe('absa-001');
    expect(await listSnippet(page)).toBe('absa-001');
  });

  test('SC-028: annotation-list and workspace render the same summary for the same list_title_field', async ({ page }) => {
    await patchProfiles(page, { tasks: ['T013'], listTitleField: 'text' });
    const ws = await annotatorSnippet(page);
    const list = await listSnippet(page);
    expect(ws).toContain('@rottenrockteahouse:');
    expect(list).toBe(ws);
  });
});
