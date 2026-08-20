import { test, expect } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html?task_id=T001';

// Tab panels arrive via fetched partials and event bindings only attach after
// the last partial (#workLogPanel) lands; wait for it before interacting.
const PANEL_LOAD_TIMEOUT = 15000;

/* w6-resilience-a11y.md RESP-02 / RESP-03: task-detail had zero mobile-width
 * coverage (the only setViewportSize call sites in tests/task-management/
 * target task-list and task-new). Same 390x844 viewport as the annotation
 * workspace mobile spec (annotation-mobile-collapsed-layout.spec.ts). */

test.use({ viewport: { width: 390, height: 844 } });

test.describe('Task detail overview panel at mobile width (RESP-02)', () => {
  test('status badge and publish action stay visible, operable, and inside the viewport', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL + '&status=draft');
    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });

    // The task status stays readable at mobile width. Note: #statusBadge
    // itself sits inside a markup-level `.exec-badges hidden` wrapper on
    // EVERY viewport (desktop specs only assert its text, which ignores
    // visibility) -- the visible status surface is the status stepper, so
    // that is what the mobile assertion targets.
    await expect(page.locator('#statusBadge')).toHaveText('草稿');
    await expect(page.locator('#statusStepper')).toBeVisible();
    await expect(page.locator('#statusStepDraft')).toHaveText('草稿');

    const dryRunBtn = page.getByRole('button', { name: '新增試標回合' });
    await expect(dryRunBtn).toBeVisible();

    // The button must be reachable without horizontal scrolling: its box
    // lies fully inside the 390px viewport, and the page itself must not
    // overflow horizontally.
    const box = await dryRunBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // Operable, not merely visible: the click still publishes.
    await dryRunBtn.click();
    await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(1);
  });
});

test.describe('Member management and review settings at mobile width (RESP-03)', () => {
  test('member management form controls stay focusable and operable', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
    await page.locator('#tabMemberManagement').click();
    await expect(page.locator('#memberManagementPanel')).not.toHaveClass(/hidden/);

    // Search input accepts focus and input at mobile width.
    const searchInput = page.locator('#memberSearchInput');
    await searchInput.click();
    await expect(searchInput).toBeFocused();

    // Row action buttons (停用 / 移除) stay operable and their touch targets
    // do not overlap each other.
    const memberRow = page.locator('#memberTableBody tr').filter({ hasText: 'Alex Wang' });
    const disableBtn = memberRow.locator('button:has-text("停用")');
    const removeBtn = memberRow.locator('button:has-text("移除")');
    // The table scrolls horizontally inside .table-wrap at mobile width;
    // the actions column starts off-screen, so bring it into view first.
    await disableBtn.scrollIntoViewIfNeeded();
    await expect(disableBtn).toBeVisible();
    await expect(removeBtn).toBeVisible();
    const disableBox = await disableBtn.boundingBox();
    const removeBox = await removeBtn.boundingBox();
    expect(disableBox).not.toBeNull();
    expect(removeBox).not.toBeNull();
    const horizontallyApart =
      disableBox!.x + disableBox!.width <= removeBox!.x || removeBox!.x + removeBox!.width <= disableBox!.x;
    const verticallyApart =
      disableBox!.y + disableBox!.height <= removeBox!.y || removeBox!.y + removeBox!.height <= disableBox!.y;
    expect(horizontallyApart || verticallyApart).toBe(true);

    await disableBtn.click();
    await page.locator('#memberActionConfirmBtn').click();
    await expect(memberRow).toContainText('停用');
  });

  test('review settings edit form stays operable', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });

    await page.locator('#reviewEditBtn').click();

    const minReviewers = page.locator('#minReviewersInput');
    await minReviewers.click();
    await expect(minReviewers).toBeFocused();
    await minReviewers.fill('2');

    // The visually-hidden checkbox is toggled through its label wrapper
    // (same pattern as task-detail-review-settings.spec.ts) -- the tap
    // target must work at mobile width too.
    await page.locator('label[for="arbitrationToggle"]').click();
    await expect(page.locator('#arbitrationToggle')).not.toBeChecked();

    await page.locator('#reviewSaveBtn').click();
    await expect(page.locator('#valueMinReviewersControl')).toHaveText('2');
    await expect(page.locator('#valueArbitrationControl')).toHaveText('停用');
  });
});
