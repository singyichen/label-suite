import { test, expect, type Page } from '@playwright/test';
import { buildListUrl } from './_workspace-helpers';

/* issue #617: FR-093 (spec 015) says review assignment is distributed
 * "在被勾選的審核員之間平均分配", and 014 FR-010s-1 names that checked list
 * explicitly -- `reviewer_ids`「即系統自動指派的分派對象（015 FR-093）」.
 * getAssignedReviewUnits() nevertheless derived the roster from the
 * REVIEWER_ROSTER demo seed, so a task's own reviewer_ids had no effect at
 * all: the people the task actually assigned saw zero units, while people
 * the task never checked saw all of them.
 *
 * Every id below is READ FROM THE PAGE rather than hardcoded. The defect is
 * "the task's field is ignored", not "these particular names are wrong", so
 * pinning literals would re-break this guard the next time the demo cast
 * changes -- and would have hidden the very mismatch this issue is about.
 */

const TASK = 'T015';
const RUN_TYPE = 'official_run';

async function taskReviewerIds(page: Page): Promise<string[]> {
  return page.evaluate((taskId) => {
    const profiles =
      (window as unknown as {
        LabelSuiteTaskDetailData?: { profiles: Record<string, { reviewerIds?: string[] }> };
      }).LabelSuiteTaskDetailData?.profiles || {};
    return profiles[taskId]?.reviewerIds || [];
  }, TASK);
}

async function allReviewUnitKeys(page: Page): Promise<string[]> {
  return page.evaluate(
    ([taskId, runType]) => {
      const data = (window as unknown as {
        LabelSuiteAnnotationWorkspaceData: {
          listReviewUnits: (t: string, r: string) => { sampleId: string; annotatorId: string }[];
        };
      }).LabelSuiteAnnotationWorkspaceData;
      return data.listReviewUnits(taskId, runType).map((u) => `${u.sampleId}/${u.annotatorId}`);
    },
    [TASK, RUN_TYPE]
  );
}

async function visibleUnitKeys(page: Page): Promise<string[]> {
  return page.getByTestId('ws-sample-item').evaluateAll((rows) =>
    rows.map((row) => {
      const id = row.querySelector('[data-testid="list-review-id"]');
      const annotator = row.querySelector('[data-testid="list-review-annotator"]');
      return `${(id?.textContent || '').trim()}/${(annotator?.textContent || '').trim()}`;
    })
  );
}

test.describe('issue #617: 審核指派名冊來源為任務自身的 reviewer_ids', () => {
  test('任務 reviewer_ids 內的每位審核員都看得到指派單位，且聯集涵蓋全部審核單位', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: TASK, role: 'reviewer', run_type: RUN_TYPE }));
    const reviewerIds = await taskReviewerIds(page);
    const allUnits = await allReviewUnitKeys(page);

    /* Guards against a vacuous pass: an empty roster or an empty task would
       satisfy every assertion below without exercising anything. */
    expect(reviewerIds.length, `${TASK} must seed a non-empty reviewer_ids`).toBeGreaterThan(0);
    expect(allUnits.length, `${TASK} must have review units to assign`).toBeGreaterThan(0);

    const union = new Set<string>();
    for (const reviewerId of reviewerIds) {
      await page.goto(buildListUrl({ task_id: TASK, role: 'reviewer', run_type: RUN_TYPE, reviewer_id: reviewerId }));
      const mine = await visibleUnitKeys(page);
      expect(mine.length, `${reviewerId} is in ${TASK}'s reviewer_ids and must be assigned work`).toBeGreaterThan(0);
      mine.forEach((key) => union.add(key));
    }

    expect([...union].sort()).toEqual([...allUnits].sort());
  });

  test('不在任務 reviewer_ids 內的審核員看不到任何單位', async ({ page }) => {
    await page.goto(
      buildListUrl({ task_id: TASK, role: 'reviewer', run_type: RUN_TYPE, reviewer_id: 'reviewer_outsider' })
    );
    expect(await visibleUnitKeys(page)).toEqual([]);
  });

  test('工作區的可處理單位推導（FR-093 指派條件）同樣讀任務 reviewer_ids', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: TASK, role: 'reviewer', run_type: RUN_TYPE }));
    const reviewerIds = await taskReviewerIds(page);
    expect(reviewerIds.length).toBeGreaterThan(0);

    /* The list page and the workspace must agree on WHO may act:
       findNextActionableReviewUnit() gates on the same FR-093 assignment, so
       anyone it hands a unit to has to be someone this task checked. Not
       "every task reviewer has work" -- a task can have fewer unfinalized
       units than reviewers, and T015 deliberately does (one pending unit
       against four reviewers), so that stronger claim would be false for
       reasons that have nothing to do with this defect.

       Candidates deliberately include the demo seed's own roster: before the
       fix that seed WAS the assignment source, so its members could act on a
       task that had never checked them -- which is exactly what this asserts
       can no longer happen. */
    const candidates = await page.evaluate((ids) => {
      const data = (window as unknown as {
        LabelSuiteAnnotationWorkspaceData: { REVIEWER_ROSTER: { id: string }[] };
      }).LabelSuiteAnnotationWorkspaceData;
      const seed = data.REVIEWER_ROSTER.map((r) => r.id);
      return [...new Set([...ids, ...seed, 'reviewer_outsider'])];
    }, reviewerIds);

    let actionableCount = 0;
    for (const reviewerId of candidates) {
      const next = await page.evaluate(
        ([taskId, runType, id]) => {
          const data = (window as unknown as {
            LabelSuiteAnnotationWorkspaceData: {
              findNextActionableReviewUnit: (t: string, r: string, rev: string) => unknown;
            };
          }).LabelSuiteAnnotationWorkspaceData;
          return data.findNextActionableReviewUnit(taskId, runType, id);
        },
        [TASK, RUN_TYPE, reviewerId]
      );
      if (next === null) continue;
      actionableCount += 1;
      expect(reviewerIds, `${reviewerId} may act on ${TASK} so ${TASK} must have checked them`)
        .toContain(reviewerId);
    }

    /* Without this the loop above passes vacuously if nobody can act at all. */
    expect(actionableCount, `${TASK} must leave at least one reviewer something to do`)
      .toBeGreaterThan(0);
  });
});
