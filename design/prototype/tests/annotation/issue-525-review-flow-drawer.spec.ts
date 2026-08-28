/**
 * Review-flow Drawer (issue #525 PR-A).
 * Source spec: specs/annotation/015-annotation-workspace/spec.md FR-064,
 * AC-4.27 / AC-4.32 / AC-4.35 / AC-4.36.
 *
 * The FR-064 banner used to carry the whole five-state track inline. `pending`
 * is every unreviewed unit's default state and the state with the least to
 * say, yet the track took the most vertical space exactly there. PR-A moves
 * the SAME track into an on-demand right-edge Drawer (full-width Modal below
 * 768px) — relocated, not reduced: the nodes, the routes, the fork SVGs and
 * the done/current classes are untouched, and annotation-review-status-track
 * .spec.ts still pins every one of them, now through this Drawer.
 *
 * Out of PR-A's scope, deliberately not asserted here: the banner/pill merge
 * and 試標 R{round} (PR-B), and rendering only the min_reviewers-reachable
 * nodes (PR-C). The Drawer shows exactly what the banner showed today.
 */
import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/** T016: official_run, min_reviewers 3, annotator kioleemg12. */
const APPROVED_UNIT = 'ofm-02-approved-interim';
const DISPUTED_UNIT = 'ofm-05-all-divergent';

const DRAWER_ID = 'wsReviewFlowDrawer';

function banner(page: Page) {
  return page.getByTestId('ws-review-unit-context');
}

function trigger(page: Page) {
  return page.getByTestId('ws-review-flow-trigger');
}

function drawer(page: Page) {
  return page.getByTestId('ws-review-flow-drawer');
}

function closeBtn(page: Page) {
  return page.getByTestId('ws-review-flow-drawer-close');
}

async function openUnit(page: Page, sampleId: string, taskId = 'T016') {
  await page.goto(
    buildWorkspaceUrl({
      task_id: taskId,
      sample_id: sampleId,
      role: 'reviewer',
      run_type: 'official_run',
      reviewer_id: 'reviewer_wang',
      annotator_id: taskId === 'T016' ? 'kioleemg12' : undefined,
    }),
  );
  await expect(banner(page)).toBeVisible();
}

test.describe('issue #525 PR-A — the trigger in the FR-064 banner', () => {
  test.beforeEach(async ({ page }) => {
    await skipGuidelineModal(page);
  });

  test('is a real button carrying aria-expanded and a stable aria-controls', async ({ page }) => {
    await openUnit(page, APPROVED_UNIT);

    const btn = trigger(page);
    await expect(btn).toBeVisible();
    await expect(btn).toHaveText('了解審核流程');
    expect(await btn.evaluate((el) => el.tagName)).toBe('BUTTON');
    await expect(btn).toHaveAttribute('type', 'button');
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await expect(btn).toHaveAttribute('aria-controls', DRAWER_ID);
    // The id the trigger points at must actually resolve to the Drawer.
    await expect(page.locator(`#${DRAWER_ID}`)).toHaveAttribute(
      'data-testid',
      'ws-review-flow-drawer',
    );
  });

  test('is appended after the existing banner content, trailed only by the issue #550 note tooltip', async ({ page }) => {
    // The trigger is the way OUT of the banner, so it reads last whatever
    // precedes it. PR-B has since reordered what precedes it into issue
    // #525 §Accessibility's run type -> state -> threshold; the trigger's
    // own position -- last -- is what this test owns and it did not move.
    await openUnit(page, APPROVED_UNIT);

    const classes = await banner(page).evaluate((el) =>
      Array.from(el.children).map((c) => c.className),
    );
    expect(classes).toEqual([
      'rv-unit-chip rv-unit-run',
      'rv-unit-state rv-unit-state-approved',
      'rv-unit-chip rv-unit-threshold',
      'rv-flow-trigger',
      'rv-review-note',
    ]);
  });

  test('follows the language toggle', async ({ page }) => {
    await openUnit(page, APPROVED_UNIT);
    await page.getByTestId('lang-toggle').click();

    await expect(trigger(page)).toHaveText('Review flow');
  });

  test('is not rendered for a unit with no annotator submission', async ({ page }) => {
    // getReviewUnitStatus() is null: no unit, so no route and no way in.
    // Visit a real unit on the same task first, or toHaveCount(0) would pass
    // simply because no trigger exists anywhere.
    await openUnit(page, 'ofs-01-agree-gold', 'T015');
    await expect(trigger(page)).toBeVisible();

    await openUnit(page, 'ofs-05-not-submitted', 'T015');
    await expect(trigger(page)).toHaveCount(0);
    await expect(drawer(page).locator('.review-track')).toHaveCount(0);
  });
});

test.describe('issue #525 PR-A — the flow track lives in the Drawer, not the banner', () => {
  test.beforeEach(async ({ page }) => {
    await skipGuidelineModal(page);
  });

  test('while closed, neither the Drawer nor the track is in the accessibility tree', async ({ page }) => {
    await openUnit(page, DISPUTED_UNIT);

    await expect(banner(page).locator('.review-track')).toHaveCount(0);
    await expect(drawer(page)).toBeHidden();
    await expect(drawer(page).locator('.review-track')).toBeHidden();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('list', { name: '審核單位狀態' })).toHaveCount(0);
  });

  test('opening reveals the same five-node track, inside the dialog', async ({ page }) => {
    await openUnit(page, DISPUTED_UNIT);
    await trigger(page).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAccessibleName('審核流程');
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'true');

    // Reverse anchor: the track must BE here, not merely be gone from the
    // banner -- deleting the feature outright must not turn this green.
    const track = dialog.locator('.review-track');
    await expect(track).toBeVisible();
    await expect(track).toHaveAttribute('role', 'list');
    await expect(track).toHaveAttribute('aria-label', '審核單位狀態');
    await expect(track.locator('[role="listitem"]')).toHaveText([
      /待審/,
      /已同意/,
      /已修改/,
      /爭議中/,
      /已定稿/,
    ]);
    await expect(track.locator('[aria-current="step"]')).toContainText('爭議中');
    await expect(track.locator('.review-track-fork')).toHaveCount(2);
  });
});

test.describe('issue #525 PR-A — Drawer focus contract', () => {
  test.beforeEach(async ({ page }) => {
    await skipGuidelineModal(page);
  });

  test('focus moves to the close button on open', async ({ page }) => {
    await openUnit(page, APPROVED_UNIT);
    await trigger(page).click();

    await expect(closeBtn(page)).toBeFocused();
  });

  test('Tab and Shift+Tab wrap inside the Drawer instead of escaping it', async ({ page }) => {
    await openUnit(page, APPROVED_UNIT);
    await trigger(page).click();

    // The Drawer holds exactly one focusable node, so "last -> first" and
    // "first -> last" are the same node: the assertion that matters is that
    // focus never leaves the dialog.
    await page.keyboard.press('Tab');
    await expect(closeBtn(page)).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(closeBtn(page)).toBeFocused();
  });

  test('Esc closes the Drawer and returns focus to the trigger', async ({ page }) => {
    await openUnit(page, APPROVED_UNIT);
    await trigger(page).click();
    await expect(drawer(page)).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(drawer(page)).toBeHidden();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(trigger(page)).toBeFocused();
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');
  });

  test('the close button closes the Drawer and returns focus to the trigger', async ({ page }) => {
    await openUnit(page, APPROVED_UNIT);
    await trigger(page).click();

    await closeBtn(page).click();
    await expect(drawer(page)).toBeHidden();
    await expect(trigger(page)).toBeFocused();
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');
  });
});

test.describe('issue #525 PR-A — the Drawer is out of the workspace document flow', () => {
  test.beforeEach(async ({ page }) => {
    await skipGuidelineModal(page);
  });

  test('opening and closing does not move the review card', async ({ page }) => {
    await openUnit(page, APPROVED_UNIT);
    const card = page.getByTestId('ws-review-row').first();
    await expect(card).toBeVisible();

    const cardTop = () => card.evaluate((el) => el.getBoundingClientRect().top);
    const before = await cardTop();

    await trigger(page).click();
    await expect(drawer(page)).toBeVisible();
    expect(await cardTop()).toBe(before);

    await closeBtn(page).click();
    await expect(drawer(page)).toBeHidden();
    expect(await cardTop()).toBe(before);
  });

  test('at 375px the Drawer is a full-width Modal with no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 720 });
    await openUnit(page, APPROVED_UNIT);
    await trigger(page).click();

    const panel = drawer(page).locator('.rv-flow-drawer');
    await expect(panel).toBeVisible();
    expect(await panel.evaluate((el) => Math.round(el.getBoundingClientRect().width))).toBe(375);

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

    // The focus contract is identical on the narrow branch.
    await expect(closeBtn(page)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(drawer(page)).toBeHidden();
    await expect(trigger(page)).toBeFocused();
  });
});
