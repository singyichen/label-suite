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
 * `pending` into two mutually exclusive lanes -- a reviewer who approves
 * every outKey (`pending` -> `finalized`) versus one who modifies or bypasses
 * any of them (`pending` -> `disputed` -> `finalized`). The same lane never
 * passes through `disputed`, so a linear track would draw a transition the
 * state machine does not have.
 *
 * issue #596 (OpenSpec change 2026-09-01-single-owner-review-relay, task
 * 3.7): FR-093 gives each unit exactly ONE reviewer, so the two interim
 * states this file used to assert -- 已同意 and 已修改, which only existed
 * while a quorum of reviewers was still being collected -- are gone. The
 * track is now three nodes (待審 / 爭議中 / 已定稿) and the branch condition
 * that used to be implied by which interim node you landed on is spelled out
 * by the `.review-track-branch` captions instead.
 *
 * issue #525 PR-A: the track lives in an on-demand review-flow drawer rather
 * than in the banner itself; openFlowDrawer() is what reveals it.
 *
 * Component contract: design/system/MASTER.md §Review Status Track
 */
import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* T016 seeds, annotator kioleemg12 (annotation-workspace.data.js:2758).
   Under the issue #596 derivation these read: ofm-01's reviewers all match
   the annotator -> same lane, finalized; ofm-05's reviewers differ -> the
   differing lane, still disputed. ofm-02 is a second same-lane finalized
   unit, used only to prove the track re-renders on unit switch. */
const UNITS = {
  finalizedSame: 'ofm-01-unanimous-gold',
  finalizedSameOther: 'ofm-02-approved-interim',
  disputed: 'ofm-05-all-divergent',
};

/* The one seeded unit that reaches 已定稿 through the differing lane: the
   reviewer changed the answer AND an arbitration record closed the dispute
   (annotation-workspace.data.js:2755, `arb: 'neutral'`). It lives on T015,
   not T016 -- no T016 row carries an arbitration record. */
const ARBITRATED = { taskId: 'T015', sampleId: 'ofs-03-arbitrated-gold' };

function track(page: Page) {
  return page.locator('[data-testid="ws-review-flow-drawer"] .review-track');
}

function branch(page: Page, key: string) {
  return track(page).locator('.review-track-branch[data-branch="' + key + '"]');
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

function unitUrl(taskId: string, sampleId: string) {
  return buildWorkspaceUrl({
    task_id: taskId,
    sample_id: sampleId,
    role: 'reviewer',
    run_type: 'official_run',
    reviewer_id: 'reviewer_wang',
    annotator_id: 'kioleemg12',
  });
}

async function openUnit(page: Page, sampleId: string, taskId = 'T016') {
  await page.goto(unitUrl(taskId, sampleId));
  await openFlowDrawer(page);
}

test.describe('Review status track — current position', () => {
  test.beforeEach(async ({ page }) => {
    await skipGuidelineModal(page);
  });

  test('renders inside the FR-064 flow drawer with three status nodes', async ({ page }) => {
    await openUnit(page, UNITS.disputed);

    await expect(track(page)).toBeVisible();
    await expect(track(page)).toHaveAttribute('role', 'list');
    await expect(track(page).locator('[role="listitem"]')).toHaveCount(3);
    await expect(track(page).locator('[role="listitem"]')).toHaveText([
      /待審/,
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

  test('a disputed unit shows the differing lane behind it', async ({ page }) => {
    await openUnit(page, UNITS.disputed);

    await expect(track(page).locator('[aria-current="step"]')).toContainText('爭議中');
    // Route so far: pending is genuinely behind it -- the unit existed between
    // the annotator's submission and the reviewer's.
    await expect(node(page, '待審')).toHaveClass(/\bdone\b/);
    await expect(node(page, '已定稿')).not.toHaveClass(/\bdone\b/);
    // The branch caption is the only thing naming which lane was taken now
    // that the interim nodes are gone.
    await expect(branch(page, 'differing')).toHaveClass(/\bdone\b/);
    await expect(branch(page, 'same')).not.toHaveClass(/\bdone\b/);
  });
});

test.describe('Review status track — finalized reaches the same node by two routes', () => {
  test.beforeEach(async ({ page }) => {
    await skipGuidelineModal(page);
  });

  test('an approved unit finalizes through 審核通過, never 爭議中', async ({ page }) => {
    await openUnit(page, UNITS.finalizedSame);

    await expect(track(page).locator('[aria-current="step"]')).toContainText('已定稿');
    await expect(node(page, '待審')).toHaveClass(/\bdone\b/);
    await expect(branch(page, 'same')).toHaveClass(/\bdone\b/);
    // The whole point of the branch: this unit's route never touched dispute.
    await expect(node(page, '爭議中')).not.toHaveClass(/\bdone\b/);
    await expect(branch(page, 'differing')).not.toHaveClass(/\bdone\b/);
    await expect(branch(page, 'arbitrated')).not.toHaveClass(/\bdone\b/);
  });

  test('an arbitrated unit finalizes through 爭議中, never 審核通過', async ({ page }) => {
    await openUnit(page, ARBITRATED.sampleId, ARBITRATED.taskId);

    await expect(track(page).locator('[aria-current="step"]')).toContainText('已定稿');
    await expect(node(page, '爭議中')).toHaveClass(/\bdone\b/);
    await expect(branch(page, 'differing')).toHaveClass(/\bdone\b/);
    // 仲裁後 is the only caption on the rail leaving 爭議中, so a differing
    // lane that reached 已定稿 must have it marked -- otherwise the track
    // would show a unit arriving at 已定稿 by no route at all.
    await expect(branch(page, 'arbitrated')).toHaveClass(/\bdone\b/);
    await expect(branch(page, 'same')).not.toHaveClass(/\bdone\b/);
  });
});

test.describe('Review status track — structure, regression and language', () => {
  test.beforeEach(async ({ page }) => {
    await skipGuidelineModal(page);
  });

  test('the two lanes are drawn on separate rows with decorative forks', async ({ page }) => {
    await openUnit(page, UNITS.disputed);

    const tops = await track(page)
      .locator('.review-track-branch[data-branch="same"], .review-track-branch[data-branch="differing"]')
      .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
    // 審核通過 and 修正或無法判定 are alternatives, not a sequence.
    expect(tops).toHaveLength(2);
    expect(tops[0]).not.toBe(tops[1]);

    const forks = track(page).locator('.review-track-fork');
    await expect(forks).toHaveCount(2);
    for (const fork of await forks.all()) {
      await expect(fork).toHaveAttribute('aria-hidden', 'true');
    }
  });

  test('the FR-064 state pill is unchanged alongside the track', async ({ page }) => {
    // The pill still carries the terminal note and the aria-label the track
    // does not; adding the route must not quietly replace it.
    await openUnit(page, UNITS.disputed);

    await expect(
      page.locator('[data-testid="ws-review-unit-context"] .rv-unit-state'),
    ).toHaveText('爭議中 · 未定稿，待仲裁');
  });

  test('a unit with no annotator submission gets no track at all', async ({ page }) => {
    // getReviewUnitStatus returns null -- there is no unit yet, so there is
    // no route to draw and the pill's 尚無標記提交 is the whole answer.
    // Visit a real unit on the same task first: without that, toHaveCount(0)
    // would pass simply because no track exists anywhere.
    await page.goto(unitUrl('T015', 'ofs-01-agree-gold'));
    await openFlowDrawer(page);
    await expect(track(page)).toBeVisible();

    await page.goto(unitUrl('T015', 'ofs-05-not-submitted'));
    await expect(page.getByTestId('ws-review-unit-context')).toBeVisible();
    await expect(track(page)).toHaveCount(0);
  });

  test('follows the language toggle', async ({ page }) => {
    await openUnit(page, UNITS.disputed);
    await expect(track(page).locator('[aria-current="step"]')).toContainText('爭議中');
    await expect(branch(page, 'differing')).toHaveText('修正或無法判定');

    await closeFlowDrawer(page);
    await page.getByTestId('lang-toggle').click();
    await openFlowDrawer(page);
    await expect(track(page).locator('[aria-current="step"]')).toContainText('Disputed');
    await expect(track(page).locator('.review-track-marker')).toHaveText('Now:');
    await expect(branch(page, 'differing')).toHaveText('Modified or undecidable');
  });

  test('re-renders when the reviewer switches unit', async ({ page }) => {
    await openUnit(page, UNITS.finalizedSameOther);
    await expect(track(page).locator('[aria-current="step"]')).toContainText('已定稿');

    await closeFlowDrawer(page);
    await page
      .locator('[data-testid="ws-sample-item"][data-sample-id="' + UNITS.disputed + '"]')
      .first()
      .click();
    await openFlowDrawer(page);
    await expect(track(page).locator('[aria-current="step"]')).toContainText('爭議中');
  });
});
