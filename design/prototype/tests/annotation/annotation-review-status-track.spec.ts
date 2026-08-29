/**
 * Review Status Track in the review-unit context banner (issue #456, AC-2).
 * Source spec: specs/annotation/015-annotation-workspace/spec.md FR-064
 *
 * The FR-064 banner answers "what state is this unit in" with a single pill.
 * It does not answer "how did it get here" or "what has to happen next",
 * which is the reviewer's actual question when a unit is neither pending nor
 * finalized. The track adds that route.
 *
 * It is deliberately NOT a linear Step Indicator: FR-051 branches after
 * `pending` into two mutually exclusive lanes -- every reviewer answer equal
 * to the annotator's (`approved` -> `finalized`) versus any answer differing
 * (`modified` -> `disputed` -> `finalized`). `approved` never passes through
 * `disputed`, so a linear track would draw a transition the state machine
 * does not have.
 *
 * T016 (official_run, min_reviewers = 3) seeds all five states on one task,
 * so every lane assertion below reads a real fixture rather than a patch.
 *
 * issue #525 PR-A: the track moved out of the banner into an on-demand
 * review-flow drawer. Every assertion below is unchanged; only its root and
 * the openFlowDrawer() step that reveals it are new.
 *
 * Component contract: design/system/MASTER.md §Review Status Track
 */
import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/** T016 seeds, annotator kioleemg12, quorum 3 (annotation-workspace.data.js:2293). */
const UNITS = {
  finalizedSame: 'ofm-01-unanimous-gold',
  approved: 'ofm-02-approved-interim',
  modified: 'ofm-03-modified-interim',
  finalizedDiffering: 'ofm-04-majority-converged',
  disputed: 'ofm-05-all-divergent',
};

function track(page: Page) {
  return page.locator('[data-testid="ws-review-flow-drawer"] .review-track');
}

/* The drawer is `aria-modal` with a backdrop, so anything outside it (the
   left column, the language toggle) is unclickable while it is open --
   tests that interact with the page close it first. */
async function openFlowDrawer(page: Page) {
  await page.getByTestId('ws-review-flow-trigger').click();
  await expect(page.getByTestId('ws-review-flow-drawer')).toBeVisible();
}

async function closeFlowDrawer(page: Page) {
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('ws-review-flow-drawer')).toBeHidden();
}

function node(page: Page, label: string) {
  return track(page).locator('.review-track-node', { hasText: label });
}

async function openUnit(page: Page, sampleId: string) {
  await page.goto(
    buildWorkspaceUrl({
      task_id: 'T016',
      sample_id: sampleId,
      role: 'reviewer',
      run_type: 'official_run',
      reviewer_id: 'reviewer_wang',
      annotator_id: 'kioleemg12',
    }),
  );
  await openFlowDrawer(page);
}

test.describe('Review status track — current position', () => {
  test.beforeEach(async ({ page }) => {
    await skipGuidelineModal(page);
  });

  test('renders inside the FR-064 flow drawer with five status nodes', async ({ page }) => {
    await openUnit(page, UNITS.disputed);

    await expect(track(page)).toBeVisible();
    await expect(track(page)).toHaveAttribute('role', 'list');
    await expect(track(page).locator('[role="listitem"]')).toHaveCount(5);
    await expect(track(page).locator('[role="listitem"]')).toHaveText([
      /待審/,
      /已同意/,
      /已修改/,
      /爭議中/,
      /已定稿/,
    ]);
  });

  test('marks exactly one current node, by text and not colour alone (AC-7)', async ({ page }) => {
    await openUnit(page, UNITS.disputed);

    const current = track(page).locator('[aria-current="step"]');
    await expect(current).toHaveCount(1);
    await expect(current).toContainText('爭議中');
    await expect(current.locator('.review-track-marker')).toHaveText('目前：');
  });

  test('an approved unit sits on the same-answer lane', async ({ page }) => {
    await openUnit(page, UNITS.approved);

    await expect(track(page).locator('[aria-current="step"]')).toContainText('已同意');
    // Route so far: pending is genuinely behind it -- the unit existed between
    // the annotator's submission and the first reviewer's.
    await expect(node(page, '待審')).toHaveClass(/\bdone\b/);
    // The differing-answer lane is not this unit's route.
    await expect(node(page, '已修改')).not.toHaveClass(/\bdone\b/);
    await expect(node(page, '爭議中')).not.toHaveClass(/\bdone\b/);
    await expect(node(page, '已定稿')).not.toHaveClass(/\bdone\b/);
  });

  test('a modified unit sits on the differing-answer lane', async ({ page }) => {
    await openUnit(page, UNITS.modified);

    await expect(track(page).locator('[aria-current="step"]')).toContainText('已修改');
    await expect(node(page, '待審')).toHaveClass(/\bdone\b/);
    await expect(node(page, '已同意')).not.toHaveClass(/\bdone\b/);
  });

  test('a disputed unit shows the differing lane behind it', async ({ page }) => {
    await openUnit(page, UNITS.disputed);

    await expect(node(page, '待審')).toHaveClass(/\bdone\b/);
    await expect(node(page, '已修改')).toHaveClass(/\bdone\b/);
    await expect(node(page, '已同意')).not.toHaveClass(/\bdone\b/);
    await expect(node(page, '已定稿')).not.toHaveClass(/\bdone\b/);
  });
});

test.describe('Review status track — finalized reaches the same node by two routes', () => {
  test.beforeEach(async ({ page }) => {
    await skipGuidelineModal(page);
  });

  test('unanimous agreement finalizes through 已同意, never 爭議中', async ({ page }) => {
    await openUnit(page, UNITS.finalizedSame);

    await expect(track(page).locator('[aria-current="step"]')).toContainText('已定稿');
    await expect(node(page, '已同意')).toHaveClass(/\bdone\b/);
    // The whole point of the branch: this unit's route never touched dispute.
    await expect(node(page, '已修改')).not.toHaveClass(/\bdone\b/);
    await expect(node(page, '爭議中')).not.toHaveClass(/\bdone\b/);
  });

  test('majority convergence finalizes through 爭議中, never 已同意', async ({ page }) => {
    await openUnit(page, UNITS.finalizedDiffering);

    await expect(track(page).locator('[aria-current="step"]')).toContainText('已定稿');
    await expect(node(page, '已修改')).toHaveClass(/\bdone\b/);
    await expect(node(page, '爭議中')).toHaveClass(/\bdone\b/);
    await expect(node(page, '已同意')).not.toHaveClass(/\bdone\b/);
  });
});

test.describe('Review status track — structure, regression and language', () => {
  test.beforeEach(async ({ page }) => {
    await skipGuidelineModal(page);
  });

  test('the two lanes are drawn on separate rows with decorative forks', async ({ page }) => {
    await openUnit(page, UNITS.disputed);

    const tops = await track(page)
      .locator('[role="listitem"]')
      .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
    // 已同意 (index 1) and 已修改 (index 2) are alternatives, not a sequence.
    expect(tops[1]).not.toBe(tops[2]);

    const forks = track(page).locator('.review-track-fork');
    await expect(forks).toHaveCount(2);
    for (const fork of await forks.all()) {
      await expect(fork).toHaveAttribute('aria-hidden', 'true');
    }
  });

  test('the FR-064 state pill is unchanged alongside the track', async ({ page }) => {
    // The pill still carries the terminal/interim note and the aria-label the
    // track does not; adding the route must not quietly replace it.
    await openUnit(page, UNITS.disputed);

    await expect(
      page.locator('[data-testid="ws-review-unit-context"] .rv-unit-state'),
    ).toHaveText('目前：爭議中 · 未定稿，待仲裁');
  });

  test('a unit with no annotator submission gets no track at all', async ({ page }) => {
    // getReviewUnitStatus returns null -- there is no unit yet, so there is
    // no route to draw and the pill's 尚無標記提交 is the whole answer.
    // Visit a real unit on the same task first: without that, toHaveCount(0)
    // would pass simply because no track exists anywhere.
    const t015 = (sampleId: string) =>
      buildWorkspaceUrl({
        task_id: 'T015',
        sample_id: sampleId,
        role: 'reviewer',
        run_type: 'official_run',
        reviewer_id: 'reviewer_wang',
      });

    await page.goto(t015('ofs-01-agree-gold'));
    await openFlowDrawer(page);
    await expect(track(page)).toBeVisible();

    await page.goto(t015('ofs-05-not-submitted'));
    await expect(page.getByTestId('ws-review-unit-context')).toBeVisible();
    await expect(track(page)).toHaveCount(0);
  });

  test('follows the language toggle', async ({ page }) => {
    await openUnit(page, UNITS.disputed);
    await expect(track(page).locator('[aria-current="step"]')).toContainText('爭議中');

    await closeFlowDrawer(page);
    await page.getByTestId('lang-toggle').click();
    await openFlowDrawer(page);
    await expect(track(page).locator('[aria-current="step"]')).toContainText('Disputed');
    await expect(track(page).locator('.review-track-marker')).toHaveText('Now:');
  });

  test('re-renders when the reviewer switches unit', async ({ page }) => {
    await openUnit(page, UNITS.approved);
    await expect(track(page).locator('[aria-current="step"]')).toContainText('已同意');

    await closeFlowDrawer(page);
    await page
      .locator('[data-testid="ws-sample-item"][data-sample-id="' + UNITS.disputed + '"]')
      .first()
      .click();
    await openFlowDrawer(page);
    await expect(track(page).locator('[aria-current="step"]')).toContainText('爭議中');
  });
});
