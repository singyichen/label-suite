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

const ROSTER = ['reviewer_wang', 'reviewer_li', 'reviewer_chen', 'reviewer_lin'] as const;

/* issue #596 (FR-093): a review unit now belongs to exactly one reviewer, so
   no single list shows a task's whole unit set any more. The seed shape this
   file pins is a property of the TASK, so it is measured as the union over
   the roster.

   Collected as DISTINCT (sample, annotator) pairs rather than summed row
   counts: FR-060 additionally puts a disputed unit on an eligible arbiter's
   list, so the same unit can legitimately appear on two reviewers' lists and
   a plain sum would over-count it. */
async function reviewUnitsAcrossRoster(
  page: Page,
  taskId: string,
  runType: 'dry_run' | 'official_run'
): Promise<Set<string>> {
  const units = new Set<string>();
  for (const reviewerId of ROSTER) {
    await page.goto(buildListUrl({ task_id: taskId, role: 'reviewer', run_type: runType, reviewer_id: reviewerId }));
    const rows = page.getByTestId('ws-sample-item');
    const count = await rows.count();
    for (let i = 0; i < count; i += 1) {
      const sampleId = (await rows.nth(i).getByTestId('list-review-id').innerText()).trim();
      const annotator = (await rows.nth(i).getByTestId('list-review-annotator').innerText()).trim();
      units.add(`${sampleId}::${annotator}`);
    }
  }
  return units;
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
  test('5 samples flatten into 15 review-unit rows across the roster', async ({ page }) => {
    expect((await reviewUnitsAcrossRoster(page, 'T014', 'dry_run')).size).toBe(15);

    /* dry_run assigns whole samples, so reviewer_wang holds dry-01 intact --
       the 3-annotator convention is still observable on one reviewer's list. */
    await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run' }));
    const rows = page.getByTestId('ws-sample-item');
    for (let i = 0; i < 3; i += 1) {
      await expect(rows.nth(i)).toContainText('dry-01-all-agree');
    }
    await expect(rows.nth(0).getByTestId('list-review-annotator')).toHaveText('kioleemg12');
    await expect(rows.nth(1).getByTestId('list-review-annotator')).toHaveText('113450022');
    await expect(rows.nth(2).getByTestId('list-review-annotator')).toHaveText('tony0950127');
  });

  test('dry-02-one-divergent carries one divergent annotator answer', async ({ page }) => {
    /* issue #596 (FR-093): dry-02 is the second of dry-01..dry-05, so the
       per-sample round robin puts it on reviewer_li, whose list is exactly
       that sample's three units. */
    await page.goto(
      buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run', reviewer_id: 'reviewer_li' })
    );

    // dry-02 rows sit at indexes 0-2: neutral / neutral (overwritten, see
    // below) / positive.
    const rows = page.getByTestId('ws-sample-item');
    await expect(rows.nth(0).getByTestId('list-review-answer')).toHaveText('neutral');
    /* issue #551: the middle row's reviewer correction ('positive') now
       converges at N=1 (min_reviewers = 1) and finalizes the unit on
       submit, instead of staying disputed. getFinalizedOverwrites()
       (annotation-list.html) already overwrites a FINALIZED row's answer
       column with the converged value for any unit finalized this way --
       this row simply never reached that branch before, since it used to
       stay disputed. It therefore now reads the reviewer's converged
       value, not the annotator's original 'neutral'. */
    await expect(rows.nth(1).getByTestId('list-review-answer')).toHaveText('positive');
    await expect(rows.nth(2).getByTestId('list-review-answer')).toHaveText('positive');
  });
});

test.describe('T015-T017 official_run: single annotator per sample', () => {
  test('T015 renders 4 rows across the roster -- ofs-05-not-submitted ships no mock row', async ({ page }) => {
    expect((await reviewUnitsAcrossRoster(page, 'T015', 'official_run')).size).toBe(4);

    for (const reviewerId of ROSTER) {
      await page.goto(
        buildListUrl({ task_id: 'T015', role: 'reviewer', run_type: 'official_run', reviewer_id: reviewerId })
      );
      await expect(page.getByTestId('ws-sample-item').filter({ hasText: 'ofs-05-not-submitted' })).toHaveCount(0);
      const annotators = page.getByTestId('list-review-annotator');
      for (let i = 0; i < (await annotators.count()); i += 1) {
        await expect(annotators.nth(i)).toHaveText('kioleemg12');
      }
    }
  });

  for (const taskId of ['T016', 'T017'] as const) {
    test(`${taskId} renders 5 single-annotator rows across the roster`, async ({ page }) => {
      expect((await reviewUnitsAcrossRoster(page, taskId, 'official_run')).size).toBe(5);

      for (const reviewerId of ROSTER) {
        await page.goto(
          buildListUrl({ task_id: taskId, role: 'reviewer', run_type: 'official_run', reviewer_id: reviewerId })
        );
        const annotators = page.getByTestId('list-review-annotator');
        for (let i = 0; i < (await annotators.count()); i += 1) {
          await expect(annotators.nth(i)).toHaveText('kioleemg12');
        }
      }
    });
  }
});
