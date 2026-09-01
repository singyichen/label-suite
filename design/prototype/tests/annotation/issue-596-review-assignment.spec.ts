import { test, expect } from '@playwright/test';
import { buildListUrl } from './_workspace-helpers';

/* Issue #596 / FR-093 (spec 015 v5.0.0, delta of
 * openspec/changes/2026-09-01-single-owner-review-relay): review assignment
 * is always automatic, MUST NOT offer a manual-assignment mode, and its
 * granularity is the ONLY flow difference between the two run_types:
 *
 *   - dry_run (per_sample): the same sample is annotated by N annotators;
 *     ALL review units that sample produces MUST go to the SAME reviewer,
 *     so that reviewer sees every annotator's answer for that sample in one
 *     pass.
 *   - official_run (per_unit): one sample = one annotator = one review
 *     unit; the system MUST spread all review units evenly across the
 *     checked reviewer roster (any two reviewers' counts differ by <= 1).
 *
 * FR-093 also states an explicitly-absent rule: a reviewer is NEVER
 * excluded from assignment merely because they happen to be the annotator
 * of that same item ("審核員不得審自己標的資料" is NOT a rule here -- only
 * arbiters have a non-participant restriction, per FR-060).
 *
 * `getReviewAssignments()` is the FR-093 assignment derivation this file
 * pins down. It does not exist yet (see PR group 1, task 1.5) -- these
 * tests are RED until it ships. The seam under test is a pure data-layer
 * function that takes an explicit list of review units and an explicit
 * checked-reviewer roster and returns the assignment, rather than reading
 * from a task's 014 `reviewer_ids` field: that field is wired up in a
 * later PR group (group 5), so this group's contract must be independently
 * exercisable without it, and a pure function keeps each scenario's inputs
 * (sample count, reviewer count, annotator/reviewer overlap) fully
 * deterministic and controlled by the test rather than by shared seed data.
 */

type Unit = { sample_id: string; annotator_id: string };
type Assignment = { sample_id: string; annotator_id: string; reviewer_id: string };

async function assignReviewers(
  page: import('@playwright/test').Page,
  runType: 'dry_run' | 'official_run',
  units: Unit[],
  reviewerIds: string[]
): Promise<Assignment[]> {
  return page.evaluate(
    ([rt, u, r]) =>
      (
        window as unknown as {
          LabelSuiteAnnotationWorkspaceData: {
            getReviewAssignments: (runType: string, units: Unit[], reviewerIds: string[]) => Assignment[];
          };
        }
      ).LabelSuiteAnnotationWorkspaceData.getReviewAssignments(rt as string, u as Unit[], r as string[]),
    [runType, units, reviewerIds]
  );
}

test.describe('issue #596 / FR-093: review assignment granularity', () => {
  test.beforeEach(async ({ page }) => {
    // Any already-seeded task is enough to load the script that will export
    // getReviewAssignments(); the function under test is pure and does not
    // read this task's own data.
    await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run' }));
    await page.waitForFunction(() =>
      Boolean((window as unknown as { LabelSuiteAnnotationWorkspaceData?: unknown }).LabelSuiteAnnotationWorkspaceData)
    );
  });

  test('dry_run: all review units of the same sample go to the same reviewer', async ({ page }) => {
    const units: Unit[] = [
      { sample_id: 'dry-assign-01', annotator_id: 'ann_a' },
      { sample_id: 'dry-assign-01', annotator_id: 'ann_b' },
      { sample_id: 'dry-assign-01', annotator_id: 'ann_c' },
    ];
    const assignments = await assignReviewers(page, 'dry_run', units, ['reviewer_wang', 'reviewer_li']);

    expect(assignments).toHaveLength(3);
    const reviewersUsed = new Set(assignments.map((a) => a.reviewer_id));
    expect(reviewersUsed.size).toBe(1);
  });

  test('official_run: review units are distributed evenly (any two reviewers differ by <= 1)', async ({ page }) => {
    // Mirrors the spec scenario verbatim: 7 official_run samples, 2 checked
    // reviewers, one of whom also annotated some of the samples.
    const units: Unit[] = Array.from({ length: 7 }, (_, i) => ({
      sample_id: `off-assign-${i + 1}`,
      annotator_id: i % 2 === 0 ? 'reviewer_wang' : 'ann_x',
    }));
    const reviewerIds = ['reviewer_wang', 'reviewer_li'];
    const assignments = await assignReviewers(page, 'official_run', units, reviewerIds);

    expect(assignments).toHaveLength(7);
    const counts: Record<string, number> = { reviewer_wang: 0, reviewer_li: 0 };
    for (const a of assignments) {
      expect(reviewerIds).toContain(a.reviewer_id);
      counts[a.reviewer_id] = (counts[a.reviewer_id] || 0) + 1;
    }
    const countValues = reviewerIds.map((id) => counts[id] || 0);
    expect(Math.max(...countValues) - Math.min(...countValues)).toBeLessThanOrEqual(1);
  });

  test('a reviewer is not excluded from assignment merely for being the annotator of that item', async ({ page }) => {
    // The only checked reviewer is also the sole annotator of the sample.
    // If assignment wrongly excluded annotators-as-reviewers, this unit
    // would come back with no eligible reviewer (undefined/null/thrown);
    // FR-093 requires it still resolves to that reviewer.
    const units: Unit[] = [{ sample_id: 'off-self-01', annotator_id: 'reviewer_wang' }];
    const assignments = await assignReviewers(page, 'official_run', units, ['reviewer_wang']);

    expect(assignments).toHaveLength(1);
    expect(assignments[0].reviewer_id).toBe('reviewer_wang');
  });
});
