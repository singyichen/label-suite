import { test, expect, type Page } from '@playwright/test';
import { buildListUrl } from './_workspace-helpers';

/* Review-flow demo mock rows + roster (spec 015, review-flow demo Phase 2
 * slice B).
 *
 * T014-T017 landed in the task-list/task-detail seeds in Phase 1, but
 * REVIEWER_MOCK_ROWS still stops at T013, so their reviewer lists render
 * zero review units. This file pins the demo roster expansion (a 4th
 * reviewer, reviewer_lin, WITHOUT can_arbitrate, so T016's three reviewers
 * wang/li/lin leave chen eligible to arbitrate) and the per-task mock row
 * shape: T014 keeps the 3-annotator dry_run convention, T015-T017 are
 * official_run single-annotator tasks -- and T015's ofs-05-not-submitted
 * sample deliberately ships NO mock row (no submission -> no review unit).
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md
 *   FR-055, FR-060, SC-004N
 */

type RosterEntry = { id: string; name: string; can_arbitrate?: boolean };

function readRoster(page: Page): Promise<RosterEntry[]> {
  return page.evaluate(
    () =>
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: { REVIEWER_ROSTER: RosterEntry[] } })
        .LabelSuiteAnnotationWorkspaceData.REVIEWER_ROSTER
  );
}

test.describe('demo roster: 4th reviewer', () => {
  test('reviewer_lin joins the roster without can_arbitrate; chen keeps it', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run' }));

    const roster = await readRoster(page);
    const ids = roster.map((entry) => entry.id);
    expect(ids).toEqual(['reviewer_wang', 'reviewer_li', 'reviewer_chen', 'reviewer_lin']);
    expect(roster.find((entry) => entry.id === 'reviewer_lin')?.can_arbitrate).toBeFalsy();
    expect(roster.find((entry) => entry.id === 'reviewer_chen')?.can_arbitrate).toBe(true);
  });
});

test.describe('T014 dry_run: 3 annotators per sample', () => {
  test('5 samples flatten into 15 review-unit rows', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run' }));

    await expect(page.getByTestId('ws-sample-item')).toHaveCount(15);

    const rows = page.getByTestId('ws-sample-item');
    for (let i = 0; i < 3; i += 1) {
      await expect(rows.nth(i)).toContainText('dry-01-all-agree');
    }
    await expect(rows.nth(0).getByTestId('list-review-annotator')).toHaveText('kioleemg12');
    await expect(rows.nth(1).getByTestId('list-review-annotator')).toHaveText('113450022');
    await expect(rows.nth(2).getByTestId('list-review-annotator')).toHaveText('tony0950127');
  });

  test('dry-02-one-divergent carries one divergent annotator answer', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run' }));

    // dry-02 rows sit at indexes 3-5: neutral / neutral (overwritten, see
    // below) / positive.
    const rows = page.getByTestId('ws-sample-item');
    await expect(rows.nth(3).getByTestId('list-review-answer')).toHaveText('neutral');
    /* issue #551: the middle row's reviewer correction ('positive') now
       converges at N=1 (min_reviewers = 1) and finalizes the unit on
       submit, instead of staying disputed. getFinalizedOverwrites()
       (annotation-list.html) already overwrites a FINALIZED row's answer
       column with the converged value for any unit finalized this way --
       this row simply never reached that branch before, since it used to
       stay disputed. It therefore now reads the reviewer's converged
       value, not the annotator's original 'neutral'. */
    await expect(rows.nth(4).getByTestId('list-review-answer')).toHaveText('positive');
    await expect(rows.nth(5).getByTestId('list-review-answer')).toHaveText('positive');
  });
});

test.describe('T015-T017 official_run: single annotator per sample', () => {
  test('T015 renders 4 rows -- ofs-05-not-submitted ships no mock row', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T015', role: 'reviewer', run_type: 'official_run' }));

    const rows = page.getByTestId('ws-sample-item');
    await expect(rows).toHaveCount(4);
    await expect(page.getByTestId('ws-sample-item').filter({ hasText: 'ofs-05-not-submitted' })).toHaveCount(0);
    for (let i = 0; i < 4; i += 1) {
      await expect(rows.nth(i).getByTestId('list-review-annotator')).toHaveText('kioleemg12');
    }
  });

  for (const taskId of ['T016', 'T017'] as const) {
    test(`${taskId} renders 5 single-annotator rows`, async ({ page }) => {
      await page.goto(buildListUrl({ task_id: taskId, role: 'reviewer', run_type: 'official_run' }));

      const rows = page.getByTestId('ws-sample-item');
      await expect(rows).toHaveCount(5);
      for (let i = 0; i < 5; i += 1) {
        await expect(rows.nth(i).getByTestId('list-review-annotator')).toHaveText('kioleemg12');
      }
    });
  }
});
