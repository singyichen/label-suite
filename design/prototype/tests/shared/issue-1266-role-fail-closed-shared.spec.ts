import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { buildListUrl, patchDataFile, skipGuidelineModal } from '../annotation/_workspace-helpers';

/* issue #1266 (shared / sidebar / admin / workspace half) -- role defaults must
 * fail closed. A missing or invalid role resolves to the LEAST privileged
 * value, never the most privileged one.
 *
 * Traceability:
 *   ADR-037:15 / :26            system role is read from stored state; absence
 *                                means no elevated privilege
 *   shared-019 FR-018           logout clears `labelsuite.systemRole`
 *   spec 015 FR-062 / FR-090    blind-review isolation; annotator-facing
 *                                history must not expose peers' answers
 *   maintainer ruling (#1266, 2026-10-12): missing/invalid system role -> `user`;
 *                                admin pages do not self-promote to super_admin;
 *                                maskHistoryForViewer with no viewer -> masked
 *
 * Page half (task-detail / task-list): issue-1266-role-fail-closed-pages.spec.ts
 *
 * Tests labelled "(guard)" pin behavior that must keep working and are green
 * on the pre-fix baseline; every other test is expected RED until Green lands.
 */

const SYSTEM_ROLE_KEY = 'labelsuite.systemRole';
const ADMIN_GROUP = '#navAdminItem';
const HIDDEN_CLASS = /(^|\s)hidden(\s|$)/;

const readSystemRole = (page: Page) =>
  page.evaluate((key) => window.localStorage.getItem(key), SYSTEM_ROLE_KEY);

test.describe('issue #1266 -- sidebar: missing system role fails closed to user', () => {
  test('profile page with no stored role: admin group hidden and stored role becomes user', async ({ page }) => {
    await page.goto('/pages/account/profile.html');
    await expect(page.locator(ADMIN_GROUP)).toBeAttached();

    await expect(page.locator(ADMIN_GROUP)).toHaveClass(HIDDEN_CLASS);
    expect(await readSystemRole(page)).toBe('user');
  });

  test('annotation-list with no stored role: admin group hidden and stored role becomes user', async ({ page }) => {
    await page.goto('/pages/annotation/annotation-list.html?task_id=T001');
    await expect(page.locator(ADMIN_GROUP)).toBeAttached();

    await expect(page.locator(ADMIN_GROUP)).toHaveClass(HIDDEN_CLASS);
    expect(await readSystemRole(page)).toBe('user');
  });

  test('renderSidebar({}) with no stored role returns an admin group carrying the hidden class', async ({ page }) => {
    await page.goto('/pages/account/profile.html');
    const adminGroupClass = await page.evaluate((key) => {
      window.localStorage.removeItem(key);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const html: string = (window as any).LabelSuiteSharedSidebar.renderSidebar({});
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const group = doc.getElementById('navAdminItem');
      return group ? group.getAttribute('class') : null;
    }, SYSTEM_ROLE_KEY);

    expect(adminGroupClass).not.toBeNull();
    expect(adminGroupClass).toMatch(HIDDEN_CLASS);
  });

  test('super_admin stored: admin group stays visible (guard)', async ({ page }) => {
    await page.addInitScript((key) => window.localStorage.setItem(key, 'super_admin'), SYSTEM_ROLE_KEY);
    await page.goto('/pages/account/profile.html');

    await expect(page.locator(ADMIN_GROUP)).toBeVisible();
    expect(await readSystemRole(page)).toBe('super_admin');
  });

  test('user stored: admin group stays hidden (guard)', async ({ page }) => {
    await page.addInitScript((key) => window.localStorage.setItem(key, 'user'), SYSTEM_ROLE_KEY);
    await page.goto('/pages/account/profile.html');

    await expect(page.locator(ADMIN_GROUP)).toHaveClass(HIDDEN_CLASS);
    expect(await readSystemRole(page)).toBe('user');
  });
});

test.describe('issue #1266 -- admin pages do not self-promote to super_admin', () => {
  for (const file of ['role-settings', 'user-management']) {
    test(`${file} with no stored role: stored role is not super_admin and admin group is hidden`, async ({ page }) => {
      await page.goto(`/pages/admin/${file}.html`);
      await expect(page.locator(ADMIN_GROUP)).toBeAttached();

      expect(await readSystemRole(page)).toBe('user');
      await expect(page.locator(ADMIN_GROUP)).toHaveClass(HIDDEN_CLASS);
    });

    test(`${file} with stored user: stays user (no self-promotion)`, async ({ page }) => {
      await page.addInitScript((key) => window.localStorage.setItem(key, 'user'), SYSTEM_ROLE_KEY);
      await page.goto(`/pages/admin/${file}.html`);
      await expect(page.locator(ADMIN_GROUP)).toBeAttached();

      expect(await readSystemRole(page)).toBe('user');
      await expect(page.locator(ADMIN_GROUP)).toHaveClass(HIDDEN_CLASS);
    });

    test(`${file} with stored super_admin: admin group visible (guard)`, async ({ page }) => {
      await page.addInitScript((key) => window.localStorage.setItem(key, 'super_admin'), SYSTEM_ROLE_KEY);
      await page.goto(`/pages/admin/${file}.html`);

      await expect(page.locator(ADMIN_GROUP)).toBeVisible();
      expect(await readSystemRole(page)).toBe('super_admin');
    });
  }
});

test.describe('issue #1266 -- logout clears the stored system role (shared-019 FR-018)', () => {
  test('desktop #logoutBtn removes labelsuite.systemRole', async ({ page }) => {
    await page.goto('/pages/account/profile.html');
    await expect(page.locator(ADMIN_GROUP)).toBeAttached();
    await page.evaluate((key) => window.localStorage.setItem(key, 'super_admin'), SYSTEM_ROLE_KEY);

    await page.locator('#logoutBtn').click();
    await page.waitForURL(/login/);

    expect(await readSystemRole(page)).toBeNull();
  });

  test('mobile #mobileLogoutBtn removes labelsuite.systemRole', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/pages/account/profile.html');
    await expect(page.locator(ADMIN_GROUP)).toBeAttached();
    await page.evaluate((key) => window.localStorage.setItem(key, 'super_admin'), SYSTEM_ROLE_KEY);

    await page.locator('#mobileLogoutBtn').click();
    await page.waitForURL(/login/);

    expect(await readSystemRole(page)).toBeNull();
  });
});

/* ── maskHistoryForViewer (via getSampleHistory) ─────────────────────────
 * Same fixture shape as issue-1268: T002 dry_run, round 1 in progress, one
 * sample carrying annotator submit -> reviewer modify -> arbiter adjudication
 * -> project-leader exception_resolved. An annotator viewer sees only their
 * own events pre-reveal. A MISSING viewer must be treated as the lowest
 * privilege (annotator), not as "unmasked". */
const TASK_ID = 'T002';
const ME = 'kioleemg12';
const REVIEWER_ID = 'reviewer_wang';
const ARBITER_ID = 'reviewer_chen';
const SAMPLE = 'emo-001';
const ARB_MARKER = 'ARB-REASON-1266-a1';
const EXC_MARKER = 'EXC-REASON-1266-b2';
const REVIEWER_MARKER = 'REVIEWER-REASON-1266';

type HistoryEvent = { action: string; role: string; actorId: string | null };

const SEED_PATCH = `
  window.LabelSuiteTaskDetailData.profiles[${JSON.stringify(TASK_ID)}].materializedRuns = { dry_run: { round: 1, total: 10 } };
  window.LabelSuiteTaskListData.tasks.find(function (t) { return t.id === ${JSON.stringify(TASK_ID)}; }).status = 'dry_run_in_progress';
  (function () {
    if (window.localStorage.getItem('seed1266')) return;
    window.localStorage.setItem('seed1266', '1');
    var data = window.LabelSuiteAnnotationWorkspaceData;
    var identity = { annotatorId: ${JSON.stringify(ME)}, reviewerId: ${JSON.stringify(REVIEWER_ID)} };
    data.markSampleSubmitted(${JSON.stringify(TASK_ID)}, 'annotator', 'dry_run', ${JSON.stringify(SAMPLE)},
      { previewState: { multi_label: { selected: ['sad', 'fear'] } } }, '', identity);
    data.markSampleSubmitted(${JSON.stringify(TASK_ID)}, 'reviewer', 'dry_run', ${JSON.stringify(SAMPLE)},
      { previewState: { multi_label: { selected: ['sad', 'angry'] } },
        decisions: { multi_label: 'modify' }, reasons: { multi_label: ${JSON.stringify(REVIEWER_MARKER)} } }, '', identity);
    var items = data.getDisputeItems(${JSON.stringify(TASK_ID)}, 'dry_run', ${JSON.stringify(SAMPLE)}, identity, ['multi_label']);
    if (!items.length) throw new Error('fixture assumption broken: no dispute items');
    data.submitArbitration(${JSON.stringify(TASK_ID)}, 'dry_run', ${JSON.stringify(SAMPLE)},
      { annotatorId: ${JSON.stringify(ME)}, reviewerId: ${JSON.stringify(ARBITER_ID)} },
      items.map(function (item) {
        return { itemId: item.outKey + '::' + item.key, choice: 'adopt_b',
          value: item.reviewerValues[${JSON.stringify(REVIEWER_ID)}], reason: ${JSON.stringify(ARB_MARKER)} };
      }));
    data.resolveExceptionPoolItem(${JSON.stringify(TASK_ID)}, 'dry_run', ${JSON.stringify(SAMPLE)}, { annotatorId: ${JSON.stringify(ME)} },
      'multi_label', 'custom_answer', ['sad'], ${JSON.stringify(EXC_MARKER)});
  })();
`;

type ViewerArg = { kind: 'undefined' } | { kind: 'null' } | { kind: 'empty' } | { kind: 'viewer'; role: string; actorId: string };

function readHistory(page: Page, viewer: ViewerArg): Promise<HistoryEvent[]> {
  return page.evaluate(
    ({ taskId, sampleId, me, viewer }) => {
      const resolved =
        viewer.kind === 'undefined' ? undefined
        : viewer.kind === 'null' ? null
        : viewer.kind === 'empty' ? {}
        : { role: viewer.role, actorId: viewer.actorId };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (window as any).LabelSuiteAnnotationWorkspaceData.getSampleHistory(
        taskId, 'dry_run', sampleId, { annotatorId: me }, resolved
      ) as HistoryEvent[];
    },
    { taskId: TASK_ID, sampleId: SAMPLE, me: ME, viewer }
  );
}

test.describe('issue #1266 -- maskHistoryForViewer: missing viewer is masked like an annotator', () => {
  test.beforeEach(async ({ page }) => {
    await skipGuidelineModal(page);
    await patchDataFile(page, 'annotation-workspace.data.js', SEED_PATCH);
    await page.goto(buildListUrl({ task_id: TASK_ID, run_type: 'dry_run' }));
  });

  test('fixture carries reviewer / adjudicated / exception_resolved events for a reviewer viewer (guard)', async ({ page }) => {
    const events = await readHistory(page, { kind: 'viewer', role: 'reviewer', actorId: REVIEWER_ID });
    const actions = events.map((e) => e.action);
    expect(actions).toContain('adjudicated');
    expect(actions).toContain('exception_resolved');
    expect(events.some((e) => e.role === 'reviewer' && e.actorId === REVIEWER_ID)).toBe(true);
    expect(JSON.stringify(events)).toContain(ARB_MARKER);
  });

  test('project_leader viewer is not masked (guard)', async ({ page }) => {
    const events = await readHistory(page, { kind: 'viewer', role: 'project_leader', actorId: 'pl_1' });
    const actions = events.map((e) => e.action);
    expect(actions).toContain('adjudicated');
    expect(actions).toContain('exception_resolved');
  });

  for (const role of ['Annotator', 'user', 'bogus']) {
    test(`viewer role "${role}" (unknown value): masked like an annotator`, async ({ page }) => {
      const events = await readHistory(page, { kind: 'viewer', role, actorId: 'someone' });
      const foreign = events.filter((e) => e.role !== 'annotator');
      expect(foreign.map((e) => `${e.role}:${e.action}`)).toEqual([]);
      expect(JSON.stringify(events)).not.toContain(ARB_MARKER);
    });
  }

  for (const kind of ['undefined', 'null', 'empty'] as const) {
    test(`viewer ${kind}: no reviewer / adjudicated / exception_resolved event and no peer markers leak`, async ({ page }) => {
      const events = await readHistory(page, { kind });
      const foreign = events.filter((e) => e.role !== 'annotator');
      expect(foreign.map((e) => `${e.role}:${e.action}`)).toEqual([]);
      const serialized = JSON.stringify(events);
      expect(serialized).not.toContain(ARB_MARKER);
      expect(serialized).not.toContain(EXC_MARKER);
      expect(serialized).not.toContain(REVIEWER_MARKER);
    });
  }
});
