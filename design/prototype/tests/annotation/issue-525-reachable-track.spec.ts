/**
 * Reachable-only Review Status Track (issue #525 PR-C).
 * Source spec: specs/annotation/015-annotation-workspace/spec.md FR-064
 * 第 8 點, AC-4.40 / AC-4.41 / AC-4.42.
 *
 * PR-C's rule is that the track draws only the states the task can actually
 * reach. It was written when `min_reviewers` made that task-dependent: a
 * quorum of 1 skipped the two "quorum not reached yet" states (已同意 /
 * 已修改), a quorum of 3 passed through them.
 *
 * issue #596 (OpenSpec change 2026-09-01-single-owner-review-relay, task
 * 3.7): FR-093 gives every unit exactly one reviewer, so `min_reviewers` and
 * both interim states are gone and the reachable set is the SAME three
 * states (待審 / 爭議中 / 已定稿) for every task. The rule survives; the
 * threshold comparison it used to be demonstrated by does not, so the
 * `min_reviewers >= 2 keeps all five states` block below was deleted rather
 * than rewritten -- it asserted a branch of the state machine that no longer
 * exists. What is left is the part PR-C uniquely owns and nothing else
 * covers: the branch captions' place in the accessibility tree and the
 * non-colour (stroke/border weight) cue that marks the taken route.
 *
 * Fixtures (annotation-workspace.data.js ~L2745):
 *   T015 official_run -- ofs-01 finalized on the same lane, ofs-03
 *        finalized through arbitration on the differing lane.
 *   T014 dry_run      -- dry-05 / annotator A disputed.
 */
import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

const BYPASS_TASK = 'T001';
const BYPASS_SAMPLE = 'sent-001';
const BYPASS_ANNOTATOR = 'kioleemg12';
const BYPASS_REVIEWER = 'reviewer_wang';

/* `bypass` (issue #596 FR-092): the reviewer cannot judge the item, so the
 * payload carries NO values[outKey] at all (design.md D3) and the unit goes
 * to 爭議中 without the reviewer proposing an answer. T001 has no seeded
 * review unit, so this is written directly rather than added to the shared
 * T014-T017 seed matrix. */
async function seedBypassUnit(page: Page): Promise<void> {
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
        previewState: {},
        decisions: { single_label: 'bypass' },
        reasons: { single_label: 'ambiguous sample' },
        values: {},
      },
      '',
      { annotatorId: a.annotator, reviewerId: a.reviewer }
    );
  }, { task: BYPASS_TASK, sample: BYPASS_SAMPLE, annotator: BYPASS_ANNOTATOR, reviewer: BYPASS_REVIEWER });
}

async function openBypassUnit(page: Page): Promise<void> {
  await page.goto(buildWorkspaceUrl({
    task_id: BYPASS_TASK, sample_id: BYPASS_SAMPLE, role: 'reviewer', run_type: 'official_run',
    annotator_id: BYPASS_ANNOTATOR, reviewer_id: BYPASS_REVIEWER,
  }));
  await seedBypassUnit(page);
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

test.describe('issue #525 PR-C — the track renders only the reachable states', () => {
  test.beforeEach(async ({ page }) => {
    await skipGuidelineModal(page);
  });

  test('a disputed unit shows 待審 / 爭議中 / 已定稿 and nothing else', async ({ page }) => {
    await openBypassUnit(page);

    await expect(track(page)).toBeVisible();
    await expect(track(page).locator('[role="listitem"]')).toHaveCount(3);
    await expect(track(page).locator('[role="listitem"]')).toHaveText([
      /待審/,
      /爭議中/,
      /已定稿/,
    ]);
    // The two quorum-interim states no longer exist at all (FR-093).
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

    // issue #596: the captions name the reviewer's DECISION, not whether the
    // answer text happened to change -- 修正 and 無法判定 share the lane.
    await expect(branch(page, 'same')).toHaveText('審核通過');
    await expect(branch(page, 'differing')).toHaveText('修正或無法判定');
    await expect(branch(page, 'arbitrated')).toHaveText('仲裁後');
    // 未收斂 labelled 已修改 -> 爭議中, a transition the state machine lost.
    await expect(branch(page, 'unconverged')).toHaveCount(0);
  });

  test('applies to dry_run as well', async ({ page }) => {
    // dry-05-pending-review / annotator A: the reviewer's decision differs
    // from the annotator's answer, so the unit sits at 爭議中 -- the same
    // three-node track the official_run cases above assert.
    await openUnit(page, {
      task_id: 'T014',
      sample_id: 'dry-05-pending-review',
      run_type: 'dry_run',
      annotator_id: 'kioleemg12',
    });

    await expect(track(page).locator('[role="listitem"]')).toHaveCount(3);
    await expect(track(page).locator('[aria-current="step"]')).toContainText('爭議中');
  });

  test('keeps the whole aria contract of the track', async ({ page }) => {
    await openBypassUnit(page);

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
    // `listitem` role so the three-node listitem contract is untouched.
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

    await expect(branch(page, 'same')).toHaveText('Review approved');
    await expect(branch(page, 'differing')).toHaveText('Modified or undecidable');
    await expect(branch(page, 'arbitrated')).toHaveText('After arbitration');
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
