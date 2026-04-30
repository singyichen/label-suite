/**
 * Dashboard page prototype tests
 * Source spec: specs/dashboard/012-dashboard/spec.md
 *
 * Tests validated against the current static HTML prototype:
 *   - Scenario switcher reveals the matching dashboard view
 *   - Each role view exposes its key content block
 *   - Language toggle updates the document language state
 *   - Responsive rendering at 375px / 768px / 1440px
 */
import { test, expect, type Page } from '@playwright/test';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';

async function openScenario(page: Page, scenario: 'super_admin_data' | 'project_leader' | 'annotator' | 'reviewer') {
  await page.goto(DASHBOARD_URL);
  const trigger = page.locator(`.scenario-pill[data-scenario="${scenario}"]`);
  await expect(trigger).toBeVisible();
  await trigger.click();
}

test.describe('Dashboard page — scenario rendering', () => {
  test('super admin view shows platform-level summary panels', async ({ page }) => {
    await openScenario(page, 'super_admin_data');
    await expect(page.getByTestId('super-admin-view')).toBeVisible();
    await expect(page.getByRole('heading', { name: /平台使用者統計|Platform Stats/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /任務概況|Task Overview/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /最近提醒|Recent Alerts/ })).toBeVisible();
    await expect(page.getByText(/專案負責人A · 審核員A · 8 位標記員 · 已完成 89%/)).toBeVisible();
    await expect(page.getByText(/專案負責人B · 審核員B · 6 位標記員 · 已完成 42%/)).toBeVisible();
  });

  test('project leader view shows my tasks list', async ({ page }) => {
    await openScenario(page, 'project_leader');
    const leaderView = page.getByTestId('project-leader-view');
    await expect(leaderView).toBeVisible();
    await expect(leaderView.getByRole('heading', { name: /任務列表|Task List/ })).toBeVisible();
    await expect(leaderView.getByRole('heading', { name: /任務概況|Task Overview/ })).toBeVisible();
    await expect(leaderView.locator('.metric strong').nth(0)).toHaveText('127');
    await expect(leaderView.locator('.metric strong').nth(1)).toHaveText('24');
    await expect(leaderView.locator('.metric strong').nth(2)).toHaveText('5');
    await expect(leaderView.locator('.metric strong').nth(3)).toHaveText('3');
    await expect(leaderView.getByText('新聞標題分類')).toBeVisible();
    await expect(leaderView.getByText('情感分析基準')).toBeVisible();
    await expect(leaderView.getByText(/審核員A · 8 位標記員 · 已完成 89%/)).toBeVisible();
    await expect(leaderView.getByText(/審核員B · 6 位標記員 · 已完成 42%/)).toBeVisible();
    await expect(leaderView.getByText('單句分類（含多標籤）')).toBeVisible();
    await expect(leaderView.getByText('單句 VA 雙維度評分（Valence / Arousal）')).toBeVisible();
    await expect(leaderView.locator('.progress')).toHaveCount(3);
  });

  test('admin view keeps the slimmer view-all button', async ({ page }) => {
    await openScenario(page, 'super_admin_data');
    const viewAllButton = page.getByRole('button', { name: /查看全部|View All/ });
    await expect(viewAllButton).toBeVisible();
    await expect(viewAllButton).toHaveCSS('min-width', '138px');
  });

  test('annotator view shows progress metrics and continue action', async ({ page }) => {
    await openScenario(page, 'annotator');
    const annotatorView = page.getByTestId('annotator-view');
    await expect(annotatorView).toBeVisible();
    await expect(annotatorView.getByRole('heading', { name: /標記概況|Annotation Overview/ })).toBeVisible();
    await expect(annotatorView.getByRole('heading', { name: /任務列表|Task List/ })).toBeVisible();
    await expect(annotatorView.locator('.metric strong').nth(0)).toHaveText('247');
    await expect(annotatorView.locator('#annotatorCompletedLabel')).toHaveText(/待標記|Pending/);
    await expect(annotatorView.locator('.metric strong').nth(1)).toHaveText('53');
    await expect(annotatorView.locator('.metric strong').nth(2)).toHaveText('4.2');
    await expect(annotatorView.getByText('新聞標題多標籤分類')).toBeVisible();
    await expect(annotatorView.getByText('情感 VA 雙維度評分')).toBeVisible();
    await expect(annotatorView.getByText(/已完成 89% · 今日 53 筆 · 平均速度 3.0/)).toBeVisible();
    await expect(annotatorView.getByText(/已完成 42% · 今日 18 筆 · 平均速度 4.2/)).toBeVisible();
    await expect(annotatorView.getByText(/試標|Dry Run/).first()).toBeVisible();
    await expect(annotatorView.getByText(/正式標記|Official Run/).first()).toBeVisible();
    await expect(annotatorView.getByRole('button', { name: /快速繼續|Continue/ })).toHaveCount(6);
  });

  test('annotator task type badges use per-category colors matching task list styles', async ({ page }) => {
    await openScenario(page, 'annotator');
    const annotatorView = page.getByTestId('annotator-view');

    const classificationBadge = annotatorView.locator('#annotatorTaskList .task-item-badges .badge').filter({ hasText: '單句分類（含多標籤）' });
    const scoringBadge = annotatorView.locator('#annotatorTaskList .task-item-badges .badge').filter({ hasText: '單句 VA 雙維度評分（Valence / Arousal）' });
    const sequenceBadges = annotatorView.locator('#annotatorTaskList .task-item-badges .badge').filter({ hasText: '序列標記（含 Aspect / NER）' });
    const relationBadge = annotatorView.locator('#annotatorTaskList .task-item-badges .badge').filter({ hasText: '關係抽取（Entity + Relation + Triple）' });
    const pairsBadge = annotatorView.locator('#annotatorTaskList .task-item-badges .badge').filter({ hasText: '句對任務（相似度 / 蘊含）' });

    await expect(classificationBadge).toHaveClass(/badge-task-type-single/);
    await expect(scoringBadge).toHaveClass(/badge-task-type-scoring/);
    await expect(sequenceBadges).toHaveCount(2);
    await expect(sequenceBadges.first()).toHaveClass(/badge-task-type-sequence/);
    await expect(sequenceBadges.nth(1)).toHaveClass(/badge-task-type-sequence/);
    await expect(relationBadge).toHaveClass(/badge-task-type-relation/);
    await expect(pairsBadge).toHaveClass(/badge-task-type-pairs/);

    await expect(classificationBadge).toHaveCSS('background-color', 'rgb(236, 254, 255)');
    await expect(scoringBadge).toHaveCSS('background-color', 'rgb(250, 245, 255)');
    await expect(sequenceBadges.first()).toHaveCSS('background-color', 'rgb(255, 247, 237)');
    await expect(relationBadge).toHaveCSS('background-color', 'rgb(236, 254, 255)');
    await expect(pairsBadge).toHaveCSS('background-color', 'rgb(236, 253, 245)');
  });

  test('reviewer view shows pending review panel and start-review action', async ({ page }) => {
    await openScenario(page, 'reviewer');
    const reviewerView = page.getByTestId('reviewer-view');
    await expect(reviewerView).toBeVisible();
    await expect(reviewerView.getByRole('heading', { name: /審核概況|Review Overview/ })).toBeVisible();
    await expect(reviewerView.getByRole('heading', { name: /任務列表|Task List/ })).toBeVisible();
    await expect(reviewerView.locator('.metric strong').nth(0)).toHaveText('12');
    await expect(reviewerView.locator('.metric strong').nth(1)).toHaveText('18');
    await expect(reviewerView.locator('.metric strong').nth(2)).toHaveText('0.81');
    await expect(reviewerView.getByText('新聞標題多標籤分類')).toBeVisible();
    await expect(reviewerView.getByText('情感 VA 雙維度評分')).toBeVisible();
    await expect(reviewerView.getByText(/待審 12 筆 · 進度 67% · IAA 0.81/)).toBeVisible();
    await expect(reviewerView.getByText(/待審 8 筆 · 進度 52% · IAA 0.78/)).toBeVisible();
    await expect(reviewerView.getByRole('button', { name: /快速審核|Quick Review/ })).toHaveCount(6);
  });

  test('annotator quick continue routes to workspace latest unfinished sample', async ({ page }) => {
    await openScenario(page, 'annotator');
    const firstContinueButton = page.getByRole('button', { name: /快速繼續|Continue/ }).first();
    await firstContinueButton.click();
    await expect(page).toHaveURL(/\/pages\/annotation\/annotation-workspace\.html\?/);
    await expect(page).toHaveURL(/role=annotator/);
    await expect(page).toHaveURL(/task_id=TASK-015-A1/);
    await expect(page).toHaveURL(/sample_id=A1-003/);
    await expect(page).toHaveURL(/run_type=official_run/);
  });

  test('annotator task card routes to annotation list when clicking outside quick continue action', async ({ page }) => {
    await openScenario(page, 'annotator');
    const firstTaskCard = page.getByTestId('annotator-view').locator('#annotatorTaskList .list-item').first();
    await firstTaskCard.click({ position: { x: 80, y: 24 } });

    await expect(page).toHaveURL(/\/pages\/annotation\/annotation-list\.html\?/);
    await expect(page).toHaveURL(/role=annotator/);
    await expect(page).toHaveURL(/task_id=TASK-015-A1/);
    await expect(page).toHaveURL(/task_type=single_sentence_classification/);
    await expect(page).toHaveURL(/run_type=official_run/);
    await expect(page).not.toHaveURL(/sample_id=/);
  });

  test('reviewer quick review routes to workspace latest unfinished sample', async ({ page }) => {
    await openScenario(page, 'reviewer');
    const firstReviewButton = page.getByRole('button', { name: /快速審核|Quick Review/ }).first();
    await firstReviewButton.click();
    await expect(page).toHaveURL(/\/pages\/annotation\/annotation-workspace\.html\?/);
    await expect(page).toHaveURL(/role=reviewer/);
    await expect(page).toHaveURL(/task_id=TASK-015-R1/);
    await expect(page).toHaveURL(/sample_id=R1-001/);
    await expect(page).toHaveURL(/run_type=official_run/);
  });

  test('annotator quick continue uses the last pending sample for NER and sentence-pairs tasks', async ({ page }) => {
    await openScenario(page, 'annotator');
    const annotatorView = page.getByTestId('annotator-view');

    const nerCard = annotatorView.locator('#annotatorTaskList .list-item').filter({ hasText: 'NER 命名實體辨識' });
    await nerCard.getByRole('button', { name: /快速繼續|Continue/ }).click();
    await expect(page).toHaveURL(/task_id=TASK-015-A6/);
    await expect(page).toHaveURL(/sample_id=NER-005/);

    await openScenario(page, 'annotator');
    const sentencePairsCard = annotatorView.locator('#annotatorTaskList .list-item').filter({ hasText: '句對相似度 \/ 蘊含判定' });
    await sentencePairsCard.getByRole('button', { name: /快速繼續|Continue/ }).click();
    await expect(page).toHaveURL(/task_id=TASK-015-A5/);
    await expect(page).toHaveURL(/sample_id=A5-005/);
  });

  test('reviewer quick review uses the last pending sample for NER tasks', async ({ page }) => {
    await openScenario(page, 'reviewer');
    const reviewerView = page.getByTestId('reviewer-view');
    const nerCard = reviewerView.locator('#reviewerTaskList .list-item').filter({ hasText: 'NER 命名實體辨識' });

    await nerCard.getByRole('button', { name: /快速審核|Quick Review/ }).click();
    await expect(page).toHaveURL(/task_id=TASK-015-R6/);
    await expect(page).toHaveURL(/sample_id=NER-005/);
  });

  test('reviewer task card routes to annotation list when clicking outside quick review action', async ({ page }) => {
    await openScenario(page, 'reviewer');
    const firstTaskCard = page.getByTestId('reviewer-view').locator('#reviewerTaskList .list-item').first();
    await firstTaskCard.click({ position: { x: 80, y: 24 } });

    await expect(page).toHaveURL(/\/pages\/annotation\/annotation-list\.html\?/);
    await expect(page).toHaveURL(/role=reviewer/);
    await expect(page).toHaveURL(/task_id=TASK-015-R1/);
    await expect(page).toHaveURL(/task_type=single_sentence_classification/);
    await expect(page).toHaveURL(/run_type=official_run/);
    await expect(page).not.toHaveURL(/sample_id=/);
  });
});

test.describe('Dashboard page — scenario switcher', () => {
  test('switching scenarios updates the active pill and visible view', async ({ page }) => {
    await page.goto(DASHBOARD_URL);

    const userPill = page.locator('.scenario-pill[data-scenario="user"]');
    const superAdminPill = page.locator('.scenario-pill[data-scenario="super_admin_data"]');
    const reviewerPill = page.locator('.scenario-pill[data-scenario="reviewer"]');

    await expect(userPill).toHaveClass(/active/);
    await expect(page.getByTestId('user-view')).toBeVisible();

    await reviewerPill.click();

    await expect(reviewerPill).toHaveClass(/active/);
    await expect(userPill).not.toHaveClass(/active/);
    await expect(superAdminPill).not.toHaveClass(/active/);
    await expect(page.getByTestId('reviewer-view')).toBeVisible();
    await expect(page.getByTestId('user-view')).not.toHaveClass(/is-active/);
  });
});

test.describe('Dashboard page — language toggle', () => {
  test('toggles the document language and visible copy between zh-TW and en', async ({ page }) => {
    await page.goto(DASHBOARD_URL);

    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
    await expect(page.getByTestId('lang-label')).toHaveText('ZH');
    await expect(page.locator('#scenarioLabel')).toHaveText('場景模式');

    await page.getByTestId('lang-toggle').click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByTestId('lang-label')).toHaveText('EN');
    await expect(page.locator('#scenarioLabel')).toHaveText('Scenario');

    await page.getByTestId('lang-toggle').click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
    await expect(page.getByTestId('lang-label')).toHaveText('ZH');
    await expect(page.locator('#scenarioLabel')).toHaveText('場景模式');
  });
});

test.describe('Dashboard page — responsive rendering', () => {
  const viewports = [
    { name: '375px (mobile)', width: 375, height: 812 },
    { name: '768px (tablet)', width: 768, height: 1024 },
    { name: '1440px (desktop)', width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    test(`renders without horizontal overflow at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(DASHBOARD_URL);
      await expect(page.getByTestId('dashboard-shell')).toBeVisible();
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    });
  }

  test('uses fixed top brand section on mobile like shared sidebar baseline', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(DASHBOARD_URL);

    const brandSection = page.locator('.brand-section');
    await expect(brandSection).toBeVisible();
    await expect(brandSection).toHaveCSS('position', 'fixed');
    await expect(brandSection).toHaveCSS('top', '0px');
    await expect(brandSection).toHaveCSS('left', '0px');
    await expect(brandSection).toHaveCSS('right', '0px');
  });
});
