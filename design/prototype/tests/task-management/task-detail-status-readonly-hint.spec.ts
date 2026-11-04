/*
 * Traceability: specs/task-management/014-task-detail/spec.md FR-026 (1)(2)(5), FR-019 (section param)
 * Issue #1125 — TDD Red.
 *
 * Defect: a project_leader viewing a NON-draft task sees the five settings edit buttons
 * disabled but every #xxxReadonlyHint empty, so the user is not told why.
 * Contract the implementer must provide: for project_leader + non-draft, each of
 *   #overviewReadonlyHint #samplingReadonlyHint #reviewReadonlyHint #guidelineReadonlyHint #settingsReadonlyHint
 * is visible with non-empty text that differs from its xxxReadonlyRoleOnly copy and mentions
 * the draft status (zh 「草稿」 / en "draft"). Draft + project_leader keeps the hint empty/hidden;
 * the role-only branch (non project_leader) is unchanged; reviewer has no edit button at all.
 *
 * Issue #1285 amendment: the `guideline` section is editable for project_leader in
 * waiting_iaa_confirmation (T002), so it is excluded from the T002 disabled+hint loops
 * (WAITING_LOCKED_SECTIONS) and its hint is covered on dry_run_in_progress via `&status=`.
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { openSettingsSection, type SettingsSlug } from './_task-detail-settings-helpers';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;
const NON_DRAFT_TASK = 'T002'; // waiting_iaa_confirmation
const DRAFT_TASK = 'T001';

type Lang = 'zh' | 'en';

const SECTIONS = [
  { key: 'overview', slug: 'basic', zhRoleOnly: '目前為唯讀角色，僅 project leader 可編輯基本資料。', enRoleOnly: 'Read-only role. Only project leader can edit task basics.' },
  { key: 'settings', slug: 'labeling', zhRoleOnly: '目前為唯讀角色，僅 project leader 可編輯標記設定。', enRoleOnly: 'Read-only role. Only project leader can edit label settings.' },
  { key: 'guideline', slug: 'guideline', zhRoleOnly: '目前為唯讀角色，僅 project leader 可編輯標記說明。', enRoleOnly: 'Read-only role. Only project leader can edit guideline.' },
  { key: 'sampling', slug: 'sampling', zhRoleOnly: '目前為唯讀角色，僅 project leader 可編輯抽樣設定。', enRoleOnly: 'Read-only role. Only project leader can edit sampling settings.' },
  { key: 'review', slug: 'review', zhRoleOnly: '目前為唯讀角色，僅 project leader 可編輯審核設定。', enRoleOnly: 'Read-only role. Only project leader can edit review settings.' },
] as const satisfies ReadonlyArray<{ key: string; slug: SettingsSlug; zhRoleOnly: string; enRoleOnly: string }>;

/* #1285: guideline content stays editable in waiting_iaa_confirmation, so T002 loops skip it. */
const WAITING_LOCKED_SECTIONS = SECTIONS.filter((s) => s.key !== 'guideline');
const GUIDELINE_SECTION = SECTIONS.find((s) => s.key === 'guideline')!;
const LOCKED_NON_DRAFT_STATUS = 'dry_run_in_progress';

async function openSection(page: Page, opts: { taskId: string; role: string; slug: SettingsSlug; lang?: Lang; status?: string }) {
  const lang = opts.lang ?? 'zh';
  await page.addInitScript((value) => {
    window.localStorage.setItem('labelsuite.lang', value);
  }, lang);
  await page.goto(`${TASK_DETAIL_URL}?task_id=${opts.taskId}&task_role=${opts.role}&tab=settings${opts.status ? `&status=${opts.status}` : ''}`);
  await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
  await openSettingsSection(page, opts.slug);
}

const hintOf = (page: Page, key: string) => page.locator(`#${key}ReadonlyHint`);
const editBtnOf = (page: Page, key: string) => page.locator(`#${key}EditBtn`);

test.describe('Non-draft readonly hint for project_leader (issue #1125)', () => {
  for (const s of WAITING_LOCKED_SECTIONS) {
    test(`${s.key}: project_leader on non-draft task sees a status hint next to the disabled edit button`, async ({ page }) => {
      await openSection(page, { taskId: NON_DRAFT_TASK, role: 'project_leader', slug: s.slug });

      await expect(editBtnOf(page, s.key)).toBeVisible();
      await expect(editBtnOf(page, s.key)).toBeDisabled();

      const hint = hintOf(page, s.key);
      await expect(hint).toBeVisible();
      await expect(hint).not.toHaveText('');
      await expect(hint).not.toHaveText(s.zhRoleOnly);
    });
  }

  for (const lang of ['zh', 'en'] as const) {
    test(`hint copy is localized (${lang}) and explains the draft-only rule`, async ({ page }) => {
      const texts: string[] = [];
      for (const s of WAITING_LOCKED_SECTIONS) {
        await openSection(page, { taskId: NON_DRAFT_TASK, role: 'project_leader', slug: s.slug, lang });
        const hint = hintOf(page, s.key);
        await expect(hint).toBeVisible();
        const text = ((await hint.textContent()) ?? '').trim();
        expect(text.length).toBeGreaterThan(0);
        expect(text).not.toBe(lang === 'zh' ? s.zhRoleOnly : s.enRoleOnly);
        if (lang === 'zh') expect(text).toContain('草稿');
        else expect(text.toLowerCase()).toContain('draft');
        texts.push(text);
      }
      // Each section names what it covers, so the four copies are distinguishable.
      expect(new Set(texts).size).toBeGreaterThan(1);
    });

    test(`guideline hint is localized (${lang}) on a non-draft, non-waiting status (#1285)`, async ({ page }) => {
      await openSection(page, { taskId: NON_DRAFT_TASK, role: 'project_leader', slug: GUIDELINE_SECTION.slug, lang, status: LOCKED_NON_DRAFT_STATUS });
      await expect(editBtnOf(page, 'guideline')).toBeDisabled();
      const hint = hintOf(page, 'guideline');
      await expect(hint).toBeVisible();
      const text = ((await hint.textContent()) ?? '').trim();
      expect(text).not.toBe(lang === 'zh' ? GUIDELINE_SECTION.zhRoleOnly : GUIDELINE_SECTION.enRoleOnly);
      if (lang === 'zh') expect(text).toContain('草稿');
      else expect(text.toLowerCase()).toContain('draft');
    });
  }
});

test.describe('Guards that must stay green (issue #1125)', () => {
  test('reviewer on draft task keeps the existing role-only copy', async ({ page }) => {
    await openSection(page, { taskId: DRAFT_TASK, role: 'reviewer', slug: 'basic' });
    const hint = hintOf(page, 'overview');
    await expect(hint).toBeVisible();
    await expect(hint).toHaveText(SECTIONS[0].zhRoleOnly);
  });

  test('project_leader on draft task has no hint and an enabled edit button', async ({ page }) => {
    for (const s of SECTIONS) {
      await openSection(page, { taskId: DRAFT_TASK, role: 'project_leader', slug: s.slug });
      await expect(editBtnOf(page, s.key)).toBeEnabled();
      await expect(hintOf(page, s.key)).toBeHidden();
      await expect(hintOf(page, s.key)).toHaveText('');
    }
  });

  test('reviewer has no edit button in any settings section (FR-026 (5))', async ({ page }) => {
    for (const s of SECTIONS) {
      await openSection(page, { taskId: NON_DRAFT_TASK, role: 'reviewer', slug: s.slug });
      await expect(editBtnOf(page, s.key)).toHaveCount(0);
    }
  });
});
