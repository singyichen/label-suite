/**
 * Reachable-only Review Status Track (issue #525 PR-C).
 * Source spec: specs/annotation/015-annotation-workspace/spec.md FR-064
 * 第 8 點, AC-4.40 / AC-4.41 / AC-4.42.
 *
 * FR-051 derives the unit state from `reviewerSubmissions.length >=
 * min_reviewers`. When `min_reviewers = 1` that predicate is true the moment
 * the first reviewer submits, so getReviewUnitStatus() jumps straight to
 * `finalized` (no diff) or `disputed` (any diff): `approved` and `modified`
 * are the "quorum not reached yet" states and have no moment in which to
 * exist (annotation-workspace.data.js getReviewUnitStatus, the
 * `enoughReviewers ? FINALIZED : APPROVED` / `!enoughReviewers -> MODIFIED`
 * lines). Drawing them anyway told every single-reviewer task's reviewer
 * about two states their task can never produce.
 *
 * The min_reviewers >= 2 track keeps all five nodes -- AC-4.32's T016
 * assertions stay literally true; the reachable-only rule only removes what
 * the threshold makes unreachable.
 *
 * Fixtures (annotation-workspace.data.js ~L2299):
 *   T015 official_run, min_reviewers 1 -- ofs-01 finalized (same lane),
 *        ofs-03 finalized by arbitration, ofs-04 pending.
 *   T014 dry_run,      min_reviewers 1 -- dry-05 / annotator A disputed
 *        (pure reject, issue #551).
 *   T016 official_run, min_reviewers 3 -- all five states.
 *   T017 official_run, min_reviewers 2 -- oft-02 approved (1 < 2).
 *
 * issue #551 (v4.54.0): min_reviewers = 1 now converges a SOLE reviewer's
 * CORRECTION on submit instead of unconditionally requiring arbitration, so
 * T015's ofs-02-modified-dispute and T014's dry-03-dispute-open (both plain
 * corrections) no longer stay disputed at this threshold -- the only way a
 * min_reviewers = 1 unit still reaches 爭議中 is a pure reject (no
 * correction). T014 already has one (dry-05-pending-review); T015 has none,
 * so the official_run "still disputed" tests below seed one directly on
 * T001 instead of adding a fixture to the shared T014-T017 seed matrix.
 */
import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

const REJECT_TASK = 'T001';
const REJECT_SAMPLE = 'sent-001';
const REJECT_ANNOTATOR = 'kioleemg12';
const REJECT_REVIEWER = 'reviewer_wang';

/* Reject with no correction (issue #551): the only min_reviewers = 1 path
 * that still reaches 爭議中 -- see the file header. */
async function seedPureRejectUnit(page: Page): Promise<void> {
  await page.evaluate((a) => {
    const data = (window as unknown as {
      LabelSuiteAnnotationWorkspaceData: {
        markSampleSubmitted: (
          taskId: string, role: string, runType: string, sampleId: string,
          payload: unknown, historySummary: string,
          identity: { annotatorId?: string; reviewerId?: string }
        ) => void;
      };
    }).LabelSuiteAnnotationWorkspaceData;
    data.markSampleSubmitted(
      a.task, 'annotator', 'official_run', a.sample,
      { previewState: { single_label: { selected: 'positive' } } }, '',
      { annotatorId: a.annotator }
    );
    data.markSampleSubmitted(
      a.task, 'reviewer', 'official_run', a.sample,
      {
        previewState: { single_label: { selected: 'positive' } },
        decisions: { single_label: 'reject' },
      },
      '',
      { annotatorId: a.annotator, reviewerId: a.reviewer }
    );
  }, { task: REJECT_TASK, sample: REJECT_SAMPLE, annotator: REJECT_ANNOTATOR, reviewer: REJECT_REVIEWER });
}

async function openPureRejectUnit(page: Page): Promise<void> {
  await page.goto(buildWorkspaceUrl({
    task_id: REJECT_TASK, sample_id: REJECT_SAMPLE, role: 'reviewer', run_type: 'official_run',
    annotator_id: REJECT_ANNOTATOR, reviewer_id: REJECT_REVIEWER,
  }));
  await seedPureRejectUnit(page);
  await page.reload();
  await page.getByTestId('ws-review-flow-trigger').click();
  await expect(page.getByTestId('ws-review-flow-drawer')).toBeVisible();
}

function track(page: Page) {
  return page.locator('[data-testid="ws-review-flow-drawer"] .review-track');
}

function node(page: Page, label: string) {
  return track(page).locator('.review-track-node', { hasText: label });
}

/** Branch captions carry `data-branch`, so the assertions below stay stable
 *  across the zh/en toggle and read the condition, not the wording. */
function branch(page: Page, name: string) {
  return track(page).locator(`.review-track-branch[data-branch="${name}"]`);
}

async function openUnit(
  page: Page,
  params: { task_id: string; sample_id: string; run_type?: 'dry_run' | 'official_run'; annotator_id?: string },
) {
  await page.goto(
    buildWorkspaceUrl({
      role: 'reviewer',
      run_type: params.run_type ?? 'official_run',
      reviewer_id: 'reviewer_wang',
      ...params,
    }),
  );
  await page.getByTestId('ws-review-flow-trigger').click();
  await expect(page.getByTestId('ws-review-flow-drawer')).toBeVisible();
}

test.describe('issue #525 PR-C — min_reviewers = 1 renders only the reachable states', () => {
  test.beforeEach(async ({ page }) => {
    await skipGuidelineModal(page);
  });

  test('a disputed unit shows 待審 / 爭議中 / 已定稿 and nothing else', async ({ page }) => {
    await openPureRejectUnit(page);

    await expect(track(page)).toBeVisible();
    await expect(track(page).locator('[role="listitem"]')).toHaveCount(3);
    await expect(track(page).locator('[role="listitem"]')).toHaveText([
      /待審/,
      /爭議中/,
      /已定稿/,
    ]);
    // The two quorum-interim states cannot occur at this threshold.
    await expect(node(page, '已同意')).toHaveCount(0);
    await expect(node(page, '已修改')).toHaveCount(0);
  });

  test('the two lanes still branch, and 已定稿 is still reached by both', async ({ page }) => {
    await openUnit(page, { task_id: 'T015', sample_id: 'ofs-01-agree-gold' });

    // Same-answer lane: pending -> finalized directly, never through 爭議中.
    await expect(track(page).locator('[aria-current="step"]')).toContainText('已定稿');
    await expect(node(page, '待審')).toHaveClass(/\bdone\b/);
    await expect(node(page, '爭議中')).not.toHaveClass(/\bdone\b/);

    // Still two rows, so the branch is visible as a branch.
    const tops = await track(page)
      .locator('[role="listitem"]')
      .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
    expect(tops[0]).not.toBe(tops[1]);
  });

  test('names the branch conditions in text, minus the unreachable one', async ({ page }) => {
    await openUnit(page, { task_id: 'T015', sample_id: 'ofs-03-arbitrated-gold' });

    await expect(branch(page, 'same')).toHaveText('答案未修改');
    await expect(branch(page, 'differing')).toHaveText('答案有修改');
    await expect(branch(page, 'arbitrated')).toHaveText('仲裁後');
    // 未收斂 labels 已修改 -> 爭議中, a transition this threshold never has.
    await expect(branch(page, 'unconverged')).toHaveCount(0);
  });

  test('applies to dry_run at the same threshold', async ({ page }) => {
    // dry-05-pending-review / annotator A: a pure reject (issue #551) --
    // the only min_reviewers = 1 path still reachable at 爭議中 (see the
    // file header; dry-03's plain correction now converges on submit).
    await openUnit(page, {
      task_id: 'T014',
      sample_id: 'dry-05-pending-review',
      run_type: 'dry_run',
      annotator_id: 'kioleemg12',
    });

    await expect(track(page).locator('[role="listitem"]')).toHaveCount(3);
    await expect(track(page).locator('[aria-current="step"]')).toContainText('爭議中');
  });

  test('keeps the whole aria contract of the five-node track', async ({ page }) => {
    await openPureRejectUnit(page);

    await expect(track(page)).toHaveAttribute('role', 'list');
    await expect(track(page)).toHaveAttribute('aria-label', '審核單位狀態');

    const current = track(page).locator('[aria-current="step"]');
    await expect(current).toHaveCount(1);
    await expect(current).toContainText('爭議中');
    await expect(current.locator('.review-track-marker')).toHaveText('目前：');

    const forks = track(page).locator('.review-track-fork');
    await expect(forks).toHaveCount(2);
    for (const fork of await forks.all()) {
      await expect(fork).toHaveAttribute('aria-hidden', 'true');
    }
  });

  test('branch captions stay in the accessibility tree', async ({ page }) => {
    // The fork SVG is aria-hidden, so before this change the branch condition
    // reached AT through nothing at all. Hiding the new text too would keep
    // that gap; the captions are therefore exposed, and they carry no
    // `listitem` role so the five-node listitem contract is untouched.
    await openUnit(page, { task_id: 'T015', sample_id: 'ofs-03-arbitrated-gold' });

    const captions = track(page).locator('.review-track-branch');
    await expect(captions).toHaveCount(3);
    for (const caption of await captions.all()) {
      await expect(caption).not.toHaveAttribute('aria-hidden', 'true');
      await expect(caption).not.toHaveAttribute('role', 'listitem');
    }
  });

  test('follows the language toggle', async ({ page }) => {
    await openUnit(page, { task_id: 'T015', sample_id: 'ofs-03-arbitrated-gold' });
    await page.keyboard.press('Escape');
    await page.getByTestId('lang-toggle').click();
    await page.getByTestId('ws-review-flow-trigger').click();

    await expect(branch(page, 'same')).toHaveText('Answers unchanged');
    await expect(branch(page, 'differing')).toHaveText('Answers changed');
    await expect(branch(page, 'arbitrated')).toHaveText('After arbitration');
  });
});

test.describe('issue #525 PR-C — min_reviewers >= 2 keeps all five states', () => {
  test.beforeEach(async ({ page }) => {
    await skipGuidelineModal(page);
  });

  test('T016 (min_reviewers = 3) is unchanged, five nodes and four branches', async ({ page }) => {
    await openUnit(page, {
      task_id: 'T016',
      sample_id: 'ofm-05-all-divergent',
      annotator_id: 'kioleemg12',
    });

    await expect(track(page).locator('[role="listitem"]')).toHaveText([
      /待審/,
      /已同意/,
      /已修改/,
      /爭議中/,
      /已定稿/,
    ]);
    await expect(branch(page, 'same')).toHaveText('答案未修改');
    await expect(branch(page, 'differing')).toHaveText('答案有修改');
    await expect(branch(page, 'unconverged')).toHaveText('未收斂');
    await expect(branch(page, 'arbitrated')).toHaveText('仲裁後');
  });

  test('T017 (min_reviewers = 2) is the lower boundary of the five-node track', async ({ page }) => {
    await openUnit(page, { task_id: 'T017', sample_id: 'oft-02-approved-interim' });

    await expect(track(page).locator('[role="listitem"]')).toHaveCount(5);
    await expect(track(page).locator('[aria-current="step"]')).toContainText('已同意');
    await expect(branch(page, 'unconverged')).toHaveCount(1);
  });
});

test.describe('issue #525 PR-C — the taken route is marked by weight, not colour alone', () => {
  test.beforeEach(async ({ page }) => {
    await skipGuidelineModal(page);
  });

  test('the taken fork arms are drawn thicker than the untaken ones', async ({ page }) => {
    await openUnit(page, { task_id: 'T015', sample_id: 'ofs-03-arbitrated-gold' });

    // Differing lane, finalized: the lower arm of each fork is on the route.
    await expect(track(page).locator('.review-track-fork path[stroke-width="3"]')).toHaveCount(2);
    await expect(track(page).locator('.review-track-fork path[stroke-width="2"]')).toHaveCount(2);
  });

  test('done nodes, rails and branch captions carry a non-colour weight cue', async ({ page }) => {
    await openUnit(page, { task_id: 'T015', sample_id: 'ofs-03-arbitrated-gold' });

    await expect(node(page, '待審')).toHaveCSS('font-weight', '600');
    await expect(branch(page, 'differing')).toHaveCSS('font-weight', '600');
    await expect(branch(page, 'same')).not.toHaveCSS('font-weight', '600');

    // The rail's line is its ::before, so a caption sitting on the rail does
    // not change the measured thickness.
    const rails = await track(page)
      .locator('.review-track-rail')
      .evaluateAll((els) =>
        els.map((el) => ({
          done: el.classList.contains('done'),
          line: window.getComputedStyle(el, '::before').height,
        })),
      );
    expect(rails.filter((r) => r.done).map((r) => r.line)).toEqual(['3px']);
    expect(rails.filter((r) => !r.done).map((r) => r.line)).toEqual(['2px']);
  });
});
