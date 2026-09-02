/**
 * issue #572 -- the review-unit context banner (FR-064) loses its card
 * frame and the state pill loses its 目前：/ Now: prefix (v4.50.0, issue
 * #525 PR-B). The banner sat inside its own bordered surface directly
 * above the bordered review card, and the pill already sits between the
 * run-type badge and the quorum chip, so both were visual noise.
 * aria-label, data-terminal, the null branch and the drawer's track marker
 * are untouched.
 */
import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

test.describe.configure({ retries: 2 });

function banner(page: Page) {
  return page.getByTestId('ws-review-unit-context');
}

function statePill(page: Page) {
  return banner(page).locator('.rv-unit-state');
}

async function openUnit(
  page: Page,
  params: { task_id: string; sample_id: string; run_type?: 'dry_run' | 'official_run'; annotator_id?: string },
) {
  await page.goto(
    buildWorkspaceUrl({
      role: 'reviewer',
      run_type: params.run_type ?? 'official_run',
      reviewer_id: 'reviewer_chen',
      ...params,
    }),
  );
  await expect(banner(page)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #572 -- banner frame removed', () => {
  test('the banner has no border, background or padding of its own', async ({ page }) => {
    await openUnit(page, { task_id: 'T017', sample_id: 'oft-01-even-tie' });

    const box = await banner(page).evaluate((el) => {
      const cs = getComputedStyle(el);
      return { borderWidth: cs.borderTopWidth, background: cs.backgroundColor, padding: `${cs.paddingTop} ${cs.paddingLeft}` };
    });
    expect(box.borderWidth).toBe('0px');
    expect(box.background).toBe('rgba(0, 0, 0, 0)');
    expect(box.padding).toBe('0px 0px');
  });

  test('the chips still render in the same order above the review card', async ({ page }) => {
    await openUnit(page, { task_id: 'T017', sample_id: 'oft-01-even-tie' });

    /* issue #596 (AC-4.37): one chip left -- the finalize-threshold chip
       went with the reviewer quorum it counted against. The subject here is
       the ORDER above the review card, which is unchanged. */
    await expect(banner(page).locator('.rv-unit-chip')).toHaveCount(1);
    await expect(page.getByTestId('ws-review-flow-trigger')).toBeVisible();
  });
});

test.describe('issue #572 -- state pill has no 目前： prefix', () => {
  test('zh: the pill is the bare state and note', async ({ page }) => {
    await openUnit(page, { task_id: 'T017', sample_id: 'oft-01-even-tie' });

    await expect(statePill(page)).toHaveText('爭議中 · 未定稿，待仲裁');
    await expect(banner(page)).not.toContainText('目前：');
  });

  test('en: no Now: prefix either', async ({ page }) => {
    await openUnit(page, { task_id: 'T017', sample_id: 'oft-01-even-tie' });
    await page.getByTestId('lang-toggle').click();

    await expect(statePill(page)).toHaveText('Disputed · not finalized, awaiting arbitration');
    await expect(banner(page)).not.toContainText('Now:');
  });

  test('finalized dry-run unit keeps its aria-label and data-terminal', async ({ page }) => {
    await openUnit(page, { task_id: 'T014', sample_id: 'dry-01-all-agree', run_type: 'dry_run', annotator_id: 'kioleemg12' });

    await expect(statePill(page)).toHaveText('已定稿 · 已鎖定');
    /* issue #596: the aria-label no longer counts reviewers against a
       threshold, but it still names the state and the locked-ness. */
    await expect(statePill(page)).toHaveAttribute('aria-label', '審核單位狀態：已定稿，內容已鎖定');
    await expect(statePill(page)).toHaveAttribute('data-terminal', 'true');
  });

  test('null status is unchanged', async ({ page }) => {
    await openUnit(page, { task_id: 'T015', sample_id: 'ofs-05-not-submitted' });

    await expect(statePill(page)).toHaveText('尚無標記提交');
  });

  test('the drawer track marker still says 目前： (AC-4.32, out of scope)', async ({ page }) => {
    await openUnit(page, { task_id: 'T017', sample_id: 'oft-01-even-tie' });
    await page.getByTestId('ws-review-flow-trigger').click();

    await expect(page.locator('.review-track-marker')).toHaveText('目前：');
  });
});
