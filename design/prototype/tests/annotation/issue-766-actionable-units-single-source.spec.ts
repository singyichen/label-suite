/**
 * FR-100 §1 / §3, SC-004Z (spec 015, issue #766) -- the finalized card's
 * remaining-count and its zero-state wording each need exactly ONE source
 * of truth, not a second definition that a test merely watches for drift.
 *
 * Source spec: specs/annotation/015-annotation-workspace/spec.md
 *   FR-100 §1 -- the remaining count MUST come from the SAME per-unit
 *                actionability judgement findNextActionableReviewUnit()
 *                already uses, so "remaining == 0" and
 *                "findNextActionableReviewUnit() returns null" can never
 *                disagree. The system MUST NOT stand up a second counting
 *                formula.
 *   FR-100 §3 -- the zero-state title/message MUST be defined exactly once
 *                and read by both the finalized card and annotation-list's
 *                `list-no-actionable-notice` (FR-073 §5) -- word for word
 *                identical in zh and en, so editing only one consumer can
 *                never make them diverge.
 *   SC-004Z  -- restates both as measurable invariants: 0 mismatches between
 *                the card's zero-state and findNextActionableReviewUnit(),
 *                0 language mismatches, exactly 1 definition of the wording
 *                in the prototype source tree.
 *
 * design.md D1 -- the data layer must EXPORT the "which units are
 * actionable" list `findNextActionableReviewUnit()` already builds
 * internally (annotation-workspace.data.js reviewUnitActionRank() /
 * findNextActionableReviewUnit()), so `findNextActionableReviewUnit()`
 * becomes derived from that list (pick min rank, earliest in enumeration
 * order) instead of the two ever computing "actionable" separately.
 * design.md D2 -- the zero-state zh/en title+message moves into the data
 * layer (alongside the existing REVIEW_SUMMARY_LABELS precedent) and
 * annotation-list.html's renderNoActionableNotice() reads that single
 * definition instead of its own page-local dictionary keys.
 *
 * This is the Red contract for the Green implementation task 1.2 (data
 * layer) that will add two NEW exports to
 * window.LabelSuiteAnnotationWorkspaceData:
 *
 *   - listActionableReviewUnits(taskId, runType, reviewerId)
 *       -> Array<{ unit: { sampleId, annotatorId, status }, rank: 1 | 2 }>
 *       in listReviewUnits(taskId, runType) enumeration order. rank is
 *       NEVER 0 -- non-actionable units are excluded from the list
 *       entirely, they don't appear with rank 0.
 *   - NO_ACTIONABLE_REVIEW_LABELS = { zh: { title, message }, en: { title, message } }
 *
 * Neither export exists yet, so every assertion below is expected to fail
 * because `data.listActionableReviewUnits` / `data.NO_ACTIONABLE_REVIEW_LABELS`
 * is `undefined`, NOT because of a page-load or selector problem.
 *
 * Part A is derived generically over every taskId in REVIEWER_MOCK_ROWS x
 * both run types x the whole REVIEWER_ROSTER (Generalization-First -- no
 * hardcoded task-id or reviewer-id branch), mirroring
 * issue-719-next-actionable-assignment-filter.spec.ts's sweep style.
 *
 * Part B reads the CURRENT annotation-list.html rendering of
 * `list-no-actionable-notice` (zh and, after the page's own language
 * toggle, en) from the live DOM rather than hardcoding the Chinese/English
 * strings in this test file, so the comparison is against whatever the list
 * page actually displays today, not a copy that could itself drift.
 */
import { test, expect } from '@playwright/test';
import { buildListUrl } from './_workspace-helpers';

interface ReviewUnit {
  sampleId: string;
  annotatorId: string;
  status: string | null;
}

interface ActionableEntry {
  unit: ReviewUnit;
  rank: number;
}

interface RosterEntry {
  id: string;
  name: string;
  can_arbitrate?: boolean;
}

interface NoActionableReviewLabels {
  zh: { title: string; message: string };
  en: { title: string; message: string };
}

interface WorkspaceData {
  listReviewUnits: (taskId: string, runType: string) => ReviewUnit[];
  findNextActionableReviewUnit: (
    taskId: string,
    runType: string,
    reviewerId: string,
  ) => ReviewUnit | null;
  listActionableReviewUnits?: (
    taskId: string,
    runType: string,
    reviewerId: string,
  ) => ActionableEntry[];
  NO_ACTIONABLE_REVIEW_LABELS?: NoActionableReviewLabels;
  REVIEWER_ROSTER: RosterEntry[];
  REVIEWER_MOCK_ROWS: Record<string, unknown>;
}

interface DataWindow {
  LabelSuiteAnnotationWorkspaceData: WorkspaceData;
}

/* Parallel workers hitting the static server occasionally drop a
 * <script src> (issue #582 lineage); every test below does its own
 * page.goto, so this guards the same known flake the sibling review-unit
 * specs already carry. */
test.describe.configure({ retries: 2 });

test.describe('Part A: listActionableReviewUnits is the single source findNextActionableReviewUnit derives from', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'official_run' }));
  });

  test('listActionableReviewUnits is exported as a function', async ({ page }) => {
    const isFn = await page.evaluate(() => {
      const data = (window as unknown as DataWindow).LabelSuiteAnnotationWorkspaceData;
      return typeof data.listActionableReviewUnits === 'function';
    });
    expect(isFn, 'window.LabelSuiteAnnotationWorkspaceData.listActionableReviewUnits must be exported').toBe(true);
  });

  test('for every task x run_type x roster reviewer, the list agrees with findNextActionableReviewUnit()', async ({ page }) => {
    const result = await page.evaluate(() => {
      const data = (window as unknown as DataWindow).LabelSuiteAnnotationWorkspaceData;
      const taskIds = Object.keys(data.REVIEWER_MOCK_ROWS);
      const runTypes = ['dry_run', 'official_run'] as const;

      const violations: {
        taskId: string;
        runType: string;
        reviewerId: string;
        reason: string;
      }[] = [];
      let nonEmptyCount = 0;

      for (const taskId of taskIds) {
        for (const runType of runTypes) {
          const enumeration = data.listReviewUnits(taskId, runType);
          const enumerationKeys = enumeration.map((u) => `${u.sampleId}\u0000${u.annotatorId}`);

          for (const entry of data.REVIEWER_ROSTER) {
            const reviewerId = entry.id;
            const nextUnit = data.findNextActionableReviewUnit(taskId, runType, reviewerId);
            const actionable = data.listActionableReviewUnits!(taskId, runType, reviewerId);
            const push = (reason: string) => violations.push({ taskId, runType, reviewerId, reason });

            // Constraint: length 0 iff findNextActionableReviewUnit() is null.
            if (actionable.length === 0 && nextUnit !== null) {
              push('list is empty but findNextActionableReviewUnit() returned a unit');
              continue;
            }
            if (actionable.length > 0 && nextUnit === null) {
              push('list is non-empty but findNextActionableReviewUnit() returned null');
              continue;
            }
            if (actionable.length === 0) continue;

            nonEmptyCount += 1;

            // Constraint: every entry has rank 1 or 2, never 0.
            actionable.forEach((e) => {
              if (e.rank !== 1 && e.rank !== 2) {
                push(`entry ${e.unit.sampleId}/${e.unit.annotatorId} has rank ${e.rank}, expected 1 or 2`);
              }
            });

            // Constraint: entries appear in listReviewUnits() enumeration order.
            const actionableKeys = actionable.map((e) => `${e.unit.sampleId}\u0000${e.unit.annotatorId}`);
            const expectedOrder = enumerationKeys.filter((k) => actionableKeys.includes(k));
            const sameOrder =
              expectedOrder.length === actionableKeys.length &&
              expectedOrder.every((k, i) => k === actionableKeys[i]);
            if (!sameOrder) {
              push(
                `entry order [${actionableKeys.join(', ')}] does not match listReviewUnits() enumeration order [${expectedOrder.join(', ')}]`,
              );
            }

            // Constraint: findNextActionableReviewUnit() equals the entry
            // with the minimum rank, earliest in enumeration order (ties
            // broken by position, matching the "entries preserve
            // enumeration order" constraint just checked).
            let best: ActionableEntry | null = null;
            for (const e of actionable) {
              if (best === null || e.rank < best.rank) best = e;
            }
            const matchesBest =
              best !== null &&
              nextUnit !== null &&
              nextUnit.sampleId === best.unit.sampleId &&
              nextUnit.annotatorId === best.unit.annotatorId &&
              nextUnit.status === best.unit.status;
            if (!matchesBest) {
              push(
                `findNextActionableReviewUnit() returned ${nextUnit ? `${nextUnit.sampleId}/${nextUnit.annotatorId}` : 'null'}, ` +
                  `expected the min-rank entry ${best ? `${best.unit.sampleId}/${best.unit.annotatorId} (rank ${best.rank})` : 'none'}`,
              );
            }
          }
        }
      }

      return { violations, nonEmptyCount };
    });

    expect(result.violations).toEqual([]);
    // Guards against a vacuously-true sweep: if the demo dataset never
    // produced a single actionable case, the constraints above would pass
    // trivially without ever exercising the non-empty branch.
    expect(
      result.nonEmptyCount,
      'the sweep over REVIEWER_MOCK_ROWS x run_type x REVIEWER_ROSTER never hit a non-empty actionable list -- the demo seed data no longer exercises this contract',
    ).toBeGreaterThan(0);
  });
});

test.describe('Part B: the zero-state wording has exactly one definition, shared with list-no-actionable-notice', () => {
  test('NO_ACTIONABLE_REVIEW_LABELS.zh matches the zh list-no-actionable-notice text', async ({ page }) => {
    await page.goto(
      buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'official_run' }) + '&notice=no_actionable_review',
    );
    const notice = page.getByTestId('list-no-actionable-notice');
    await expect(notice).toBeVisible();
    const renderedTitle = await notice.locator('strong').textContent();
    const renderedMessage = await notice.locator('span').textContent();

    const labels = await page.evaluate(() => {
      const data = (window as unknown as DataWindow).LabelSuiteAnnotationWorkspaceData;
      return data.NO_ACTIONABLE_REVIEW_LABELS;
    });

    expect(labels, 'window.LabelSuiteAnnotationWorkspaceData.NO_ACTIONABLE_REVIEW_LABELS must be exported').toBeDefined();
    expect(labels!.zh.title).toBe(renderedTitle);
    expect(labels!.zh.message).toBe(renderedMessage);
  });

  test('NO_ACTIONABLE_REVIEW_LABELS.en matches the en list-no-actionable-notice text after switching language', async ({ page }) => {
    await page.goto(
      buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'official_run' }) + '&notice=no_actionable_review',
    );
    const notice = page.getByTestId('list-no-actionable-notice');
    await expect(notice).toBeVisible();

    await page.locator('#langToggle').click();

    const renderedTitle = await notice.locator('strong').textContent();
    const renderedMessage = await notice.locator('span').textContent();

    const labels = await page.evaluate(() => {
      const data = (window as unknown as DataWindow).LabelSuiteAnnotationWorkspaceData;
      return data.NO_ACTIONABLE_REVIEW_LABELS;
    });

    expect(labels, 'window.LabelSuiteAnnotationWorkspaceData.NO_ACTIONABLE_REVIEW_LABELS must be exported').toBeDefined();
    expect(labels!.en.title).toBe(renderedTitle);
    expect(labels!.en.message).toBe(renderedMessage);
  });
});
