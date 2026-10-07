/*
 * Issue #1146 — the arbiter roster comes ONLY from the task's own `arbiterIds`.
 *
 * Contract sources:
 * - specs/annotation/015-annotation-workspace/spec.md FR-060 (arbiter eligibility
 *   is the task's `arbiter_ids`, never the global demo flag)
 * - Maintainer rulings on #1146: (1) a missing `arbiterIds` means no arbiter and
 *   ids that are not roster members are dropped; (2) T001-T013 are seeded
 *   explicitly with ['reviewer_chen'] so their behaviour is unchanged;
 *   (3) a task with no arbiter shows 未指定 and reviewer_chen cannot arbitrate.
 *
 * "Disabled" note: the workspace data layer has no disabled-reviewer notion
 * (only task-detail's member table does), so stale-id filtering is pinned
 * against REVIEWER_ROSTER membership.
 */
import { test, expect, type Page } from '@playwright/test';
import { buildListUrl } from '../annotation/_workspace-helpers';
import { TASK_DETAIL_URL } from './_dry-run-completion-helpers';

interface TaskProfile {
  reviewerIds?: string[];
  arbiterIds?: string[];
}

interface TestWindow {
  LabelSuiteAnnotationWorkspaceData: {
    taskArbiterRoster: (taskId: string) => string[];
    REVIEWER_ROSTER: { id: string }[];
  };
  LabelSuiteTaskDetailData: { profiles: Record<string, TaskProfile> };
  TASK_DATA: { arbiterIds: string[] };
}

const SEEDED_TASKS = Array.from({ length: 13 }, (_, i) => `T${String(i + 1).padStart(3, '0')}`);

async function loadData(page: Page): Promise<void> {
  await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run' }));
  await page.waitForFunction(() => {
    const w = window as unknown as Partial<TestWindow>;
    return Boolean(w.LabelSuiteAnnotationWorkspaceData && w.LabelSuiteTaskDetailData);
  });
}

test('a profile without the arbiterIds key yields no arbiter instead of the demo can_arbitrate fallback', async ({ page }) => {
  await loadData(page);
  const roster = await page.evaluate(() => {
    const w = window as unknown as TestWindow;
    delete w.LabelSuiteTaskDetailData.profiles.T001.arbiterIds;
    return w.LabelSuiteAnnotationWorkspaceData.taskArbiterRoster('T001');
  });
  expect(roster).toEqual([]);
});

test('a task id with no profile at all yields no arbiter', async ({ page }) => {
  await loadData(page);
  const roster = await page.evaluate(() =>
    (window as unknown as TestWindow).LabelSuiteAnnotationWorkspaceData.taskArbiterRoster('T-no-such-task'),
  );
  expect(roster).toEqual([]);
});

test('stale arbiter ids that are not roster members are dropped; all-stale yields no arbiter', async ({ page }) => {
  await loadData(page);
  const result = await page.evaluate(() => {
    const w = window as unknown as TestWindow;
    const data = w.LabelSuiteAnnotationWorkspaceData;
    const profile = w.LabelSuiteTaskDetailData.profiles.T014;
    profile.arbiterIds = ['reviewer_removed', 'reviewer_chen'];
    const mixed = data.taskArbiterRoster('T014');
    profile.arbiterIds = ['reviewer_removed'];
    const allStale = data.taskArbiterRoster('T014');
    return { mixed, allStale };
  });
  expect(result.mixed).toEqual(['reviewer_chen']);
  expect(result.allStale).toEqual([]);
});

test('every seeded profile T001-T013 declares arbiterIds explicitly as [reviewer_chen]', async ({ page }) => {
  await loadData(page);
  const seeded = await page.evaluate((ids) => {
    const profiles = (window as unknown as TestWindow).LabelSuiteTaskDetailData.profiles;
    const out: Record<string, string[] | undefined> = {};
    ids.forEach((id) => { out[id] = profiles[id]?.arbiterIds; });
    return out;
  }, SEEDED_TASKS);
  const expected: Record<string, string[]> = {};
  SEEDED_TASKS.forEach((id) => { expected[id] = ['reviewer_chen']; });
  expect(seeded).toEqual(expected);
});

test('T001: task-detail and workspace agree on the arbiter roster and the summary is not 未指定', async ({ page }) => {
  await page.goto(`${TASK_DETAIL_URL}?task_id=T001`);
  await expect(page.locator('#statusBadge')).toBeAttached();
  await expect(page.locator('#valueArbiterIdsControl')).not.toHaveText('未指定仲裁者');
  const { detail, workspace } = await page.evaluate(() => {
    const w = window as unknown as TestWindow;
    return {
      detail: w.TASK_DATA.arbiterIds,
      workspace: w.LabelSuiteAnnotationWorkspaceData.taskArbiterRoster('T001'),
    };
  });
  expect(workspace).toEqual(detail);
  expect(workspace).toEqual(['reviewer_chen']);
});
