/**
 * Issue #452 — every reviewer progress number names its subject and its
 * denominator, and only `finalized` reads as a terminal state.
 *
 * Before this change the reviewer saw three different numbers all spelled
 * 「已審 / 覆蓋」 with no subject:
 *   - dashboard / annotation-list  「審核覆蓋率 100%」  (task, over review units)
 *   - workspace top progress        「已審 1 / 4」      (THIS reviewer's own submissions)
 *   - review-unit context banner    「已審 1 / 1」      (the finalize threshold)
 * and 「已同意」/「已修改」 carried a settled-looking badge while the unit was
 * still short of its min_reviewers threshold.
 *
 * These tests pin the disambiguated vocabulary:
 *   - task level      「任務覆蓋 4 / 5 個審核單位」
 *   - reviewer level  「我的審核提交 0 / 5 個審核單位」
 *   - unit level      「定稿門檻 1 / 3 位審核員」
 *   - interim pills carry a 「未達定稿門檻 x / n」 note, finalized carries
 *     「已鎖定」, and the distinction is exposed as text + data-terminal,
 *     never colour alone.
 *
 * T015 / T016 / T017 cover thresholds 1 / 3 / 2 respectively (AC-8).
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md FR-076,
 *   AC-1.24; specs/dashboard/012-dashboard/spec.md FR-022
 */
import { test, expect, type Page } from '@playwright/test';
import { buildListUrl } from './_workspace-helpers';

const WORKSPACE_URL = '/pages/annotation/annotation-workspace.html';
const DASHBOARD_URL = '/pages/dashboard/dashboard.html';

async function openReviewerWorkspace(
  page: Page,
  taskId: string,
  sampleId: string,
  runType: 'dry_run' | 'official_run' = 'official_run',
) {
  await page.goto(
    `${WORKSPACE_URL}?task_id=${taskId}&sample_id=${sampleId}` +
      `&role=reviewer&run_type=${runType}&reviewer_id=reviewer_chen`,
  );
}

function contextBanner(page: Page) {
  return page.locator('[data-testid="ws-review-unit-context"]');
}

function statePill(page: Page) {
  return contextBanner(page).locator('.rv-unit-state');
}

test.describe('issue #452 — task-level coverage names the review-unit denominator', () => {
  test('annotation-list T017 reads 任務覆蓋 4 / 5 個審核單位, never a bare 覆蓋率', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T017', role: 'reviewer', run_type: 'official_run' }));

    const detail = page.locator('#taskInfoDetail');
    await expect(detail).toContainText(
      '任務覆蓋 4 / 5 個審核單位 · 待審 1 個 · 未達定稿門檻 4 個 · 爭議中 1 個 · IAA 無法計算',
    );
    await expect(detail).not.toContainText('審核覆蓋率');
  });

  test('annotation-list T016 shows full coverage and the unfinalized count side by side', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T016', role: 'reviewer', run_type: 'official_run' }));

    await expect(page.locator('#taskInfoDetail')).toContainText(
      '任務覆蓋 5 / 5 個審核單位 · 未達定稿門檻 3 個 · 爭議中 1 個 · IAA 無法計算',
    );
  });

  test('dashboard reviewer card carries the same subject-bearing wording', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    const trigger = page.locator('.scenario-pill[data-scenario="reviewer"]');
    await expect(trigger).toBeVisible();
    await trigger.click();

    const card = page.locator('.role-task-card[data-role="reviewer"][data-example-task-id="T016"]').first();
    await expect(card).toContainText('任務覆蓋 5 / 5 個審核單位');
    await expect(card).toContainText('未達定稿門檻 3 個');
  });

  test('a task with no derivable review state still names its denominator', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    const trigger = page.locator('.scenario-pill[data-scenario="reviewer"]');
    await expect(trigger).toBeVisible();
    await trigger.click();

    const card = page.locator('.role-task-card[data-role="reviewer"][data-example-task-id="T001"]').first();
    await expect(card).toContainText('個審核單位');
    await expect(card).not.toContainText('進度');
  });
});

test.describe('issue #452 — the workspace top progress is MY submissions', () => {
  test('T016 reviewer progress names the reviewer as its subject', async ({ page }) => {
    await openReviewerWorkspace(page, 'T016', 'ofm-01-unanimous-gold');

    await expect(page.getByTestId('ws-progress-text')).toHaveText(
      /^我的審核提交 \d+ \/ 5 個審核單位$/,
    );
  });
});

test.describe('issue #452 — the unit banner states the finalize threshold', () => {
  /* AC-8: threshold 1 (T015), 3 (T016), 2 (T017). */
  test('T015 (threshold 1) finalized unit is the only state that reads as locked', async ({ page }) => {
    await openReviewerWorkspace(page, 'T015', 'ofs-01-agree-gold');

    await expect(contextBanner(page)).toContainText('定稿門檻 1 / 1 位審核員');
    await expect(contextBanner(page)).not.toContainText('已審 ');
    const pill = statePill(page);
    await expect(pill).toHaveText('已定稿 · 已鎖定');
    await expect(pill).toHaveAttribute('data-terminal', 'true');
    await expect(pill).toHaveAttribute(
      'aria-label',
      '已定稿，已達 1 位審核員門檻，內容已鎖定',
    );
  });

  test('T016 (threshold 3) approved unit is flagged short of the threshold', async ({ page }) => {
    await openReviewerWorkspace(page, 'T016', 'ofm-02-approved-interim');

    await expect(contextBanner(page)).toContainText('定稿門檻 1 / 3 位審核員');
    const pill = statePill(page);
    await expect(pill).toHaveText('已同意 · 未達定稿門檻 1 / 3');
    await expect(pill).toHaveAttribute('data-terminal', 'false');
    await expect(pill).toHaveAttribute(
      'aria-label',
      '已同意，已有 1 位審核員／共需 3 位',
    );
  });

  test('T016 (threshold 3) modified unit is flagged short of the threshold', async ({ page }) => {
    await openReviewerWorkspace(page, 'T016', 'ofm-03-modified-interim');

    const pill = statePill(page);
    await expect(pill).toHaveText('已修改 · 未達定稿門檻 1 / 3');
    await expect(pill).toHaveAttribute('data-terminal', 'false');
  });

  test('T017 (threshold 2) approved unit reports 1 / 2', async ({ page }) => {
    await openReviewerWorkspace(page, 'T017', 'oft-02-approved-interim');

    await expect(contextBanner(page)).toContainText('定稿門檻 1 / 2 位審核員');
    await expect(statePill(page)).toHaveText('已同意 · 未達定稿門檻 1 / 2');
  });

  test('T017 (threshold 2) a met threshold that is still disputed says so in words', async ({ page }) => {
    await openReviewerWorkspace(page, 'T017', 'oft-01-even-tie');

    await expect(contextBanner(page)).toContainText('定稿門檻 2 / 2 位審核員');
    const pill = statePill(page);
    await expect(pill).toHaveText('爭議中 · 未定稿，待仲裁');
    await expect(pill).toHaveAttribute('data-terminal', 'false');
  });
});

test.describe('issue #452 — annotation-list badges separate interim from terminal', () => {
  test('T016 rows spell out 未定稿 / 已鎖定 instead of relying on badge colour', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T016', role: 'reviewer', run_type: 'official_run' }));

    const rows = page.getByTestId('ws-sample-item');
    await expect(rows.nth(0).locator('.status-badge')).toHaveText('已定稿 · 已鎖定');
    await expect(rows.nth(1).locator('.status-badge')).toHaveText('已同意 · 未定稿');
    await expect(rows.nth(2).locator('.status-badge')).toHaveText('已修改 · 未定稿');
    await expect(rows.nth(4).locator('.status-badge')).toHaveText('爭議中 · 未定稿');

    /* AC-5: the interim states must not reuse the terminal badge colour. */
    await expect(rows.nth(0).locator('.status-badge')).toHaveClass(/status-submitted/);
    await expect(rows.nth(1).locator('.status-badge')).not.toHaveClass(/status-submitted/);
  });
});
