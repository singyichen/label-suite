/**
 * Role-dependent action hint under the review-unit context banner (issue #526).
 * Source spec: specs/annotation/015-annotation-workspace/spec.md FR-084,
 * AC-4.47 / AC-4.48 / AC-4.49 / AC-4.50 (FR-064 point 7.6 cross-reference).
 *
 * The banner (FR-064) says where a unit IS; it cannot say whether the
 * reviewer looking at it still has anything to do there. The same
 * approved / modified / disputed pill means "review it" to one reviewer,
 * "wait" to a second and "arbitrate" to a third. One short sentence, derived
 * from REVIEW_UNIT_STATUS x (did I submit) x isArbiterCandidate(), answers
 * that -- and only the two branches that need the CURRENT reviewer carry
 * `data-needs-action="true"`.
 *
 * Fixtures (annotation-review-flow-demo-seed.spec.ts status matrix):
 *   T016 (min 3) ofm-02 approved [wang]      ofm-05 disputed [wang, li, lin]
 *   T017 (min 2) oft-01 disputed [wang, li]  oft-03 modified [wang]
 *                oft-05 pending
 *   T016 ofm-01 finalized · T015 ofs-05 no annotator submission (null)
 *   T014 dry_run dry-05 x kioleemg12 disputed [wang, pure reject]
 * reviewer_chen is the only can_arbitrate reviewer; reviewer_lin never
 * reviewed any of the units above.
 */
import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

test.describe.configure({ retries: 2 });

const HINT = 'ws-review-action-hint';

function banner(page: Page) {
  return page.getByTestId('ws-review-unit-context');
}

function hint(page: Page) {
  return page.getByTestId(HINT);
}

async function openUnit(
  page: Page,
  params: {
    task_id: string;
    sample_id: string;
    run_type?: 'dry_run' | 'official_run';
    reviewer_id?: string;
    annotator_id?: string;
  },
) {
  await page.goto(
    buildWorkspaceUrl({
      role: 'reviewer',
      run_type: params.run_type ?? 'official_run',
      reviewer_id: params.reviewer_id ?? 'reviewer_chen',
      annotator_id: params.annotator_id ?? 'kioleemg12',
      ...params,
    }),
  );
  await expect(banner(page)).toBeVisible();
}

async function expectStatusNote(page: Page, text: string) {
  await expect(hint(page)).toHaveCount(1);
  await expect(hint(page)).toHaveText(text);
  await expect(hint(page)).not.toHaveAttribute('data-needs-action', /.*/);
  // A status note is plain text at body level, never something that looks
  // or behaves like a control.
  expect(await hint(page).evaluate((el) => el.tagName)).not.toMatch(/^(BUTTON|A)$/);
  await expect(hint(page).locator('button, a')).toHaveCount(0);
  await expect(hint(page)).not.toContainText('下一步');
}

async function expectNeedsAction(page: Page, text: string) {
  await expect(hint(page)).toHaveCount(1);
  await expect(hint(page)).toHaveText(text);
  await expect(hint(page)).toHaveAttribute('data-needs-action', 'true');
  // The words carry the meaning; no second "needs action" pill duplicates it.
  await expect(page.locator('[data-needs-action="true"]')).toHaveCount(1);
  await expect(page.getByText('需要行動', { exact: true })).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('AC-4.47 — approved / modified split on whether I already submitted', () => {
  test('T016 ofm-02 approved, chen has not submitted: 需要你的審核', async ({ page }) => {
    await openUnit(page, { task_id: 'T016', sample_id: 'ofm-02-approved-interim' });
    await expectNeedsAction(page, '需要你的審核');
  });

  test('T016 ofm-02 approved, wang already submitted: recorded, waiting for 2 more', async ({ page }) => {
    await openUnit(page, { task_id: 'T016', sample_id: 'ofm-02-approved-interim', reviewer_id: 'reviewer_wang' });
    await expectStatusNote(page, '你的審核已記錄，等待另外 2 位審核員');
  });

  test('the remaining count equals the threshold chip\'s n - x', async ({ page }) => {
    await openUnit(page, { task_id: 'T016', sample_id: 'ofm-02-approved-interim', reviewer_id: 'reviewer_wang' });
    const chip = await banner(page).locator('.rv-unit-threshold').innerText();
    const m = chip.match(/(\d+)\s*\/\s*(\d+)/);
    expect(m).not.toBeNull();
    const remaining = Number(m![2]) - Number(m![1]);
    await expect(hint(page)).toHaveText(`你的審核已記錄，等待另外 ${remaining} 位審核員`);
  });

  test('T017 oft-03 modified: chen must review, wang waits for 1 more', async ({ page }) => {
    await openUnit(page, { task_id: 'T017', sample_id: 'oft-03-modified-interim' });
    await expectNeedsAction(page, '需要你的審核');

    await openUnit(page, { task_id: 'T017', sample_id: 'oft-03-modified-interim', reviewer_id: 'reviewer_wang' });
    await expectStatusNote(page, '你的審核已記錄，等待另外 1 位審核員');
  });

  test('English copy carries the same meaning', async ({ page }) => {
    await openUnit(page, { task_id: 'T016', sample_id: 'ofm-02-approved-interim' });
    await page.getByTestId('lang-toggle').click();
    await expect(hint(page)).toHaveText('Your review is needed');

    await openUnit(page, { task_id: 'T016', sample_id: 'ofm-02-approved-interim', reviewer_id: 'reviewer_wang' });
    await page.getByTestId('lang-toggle').click();
    await expect(hint(page)).toHaveText('Your review is recorded; waiting for 2 more reviewer(s)');
  });
});

test.describe('AC-4.48 — disputed splits arbiter candidate / participant / no eligibility', () => {
  test('T016 ofm-05, chen can arbitrate and did not take part: 需要你的仲裁', async ({ page }) => {
    await openUnit(page, { task_id: 'T016', sample_id: 'ofm-05-all-divergent' });
    await expectNeedsAction(page, '需要你的仲裁');
  });

  test('T017 oft-01, chen: 需要你的仲裁 (arbitration card is the layout, hint still renders)', async ({ page }) => {
    await openUnit(page, { task_id: 'T017', sample_id: 'oft-01-even-tie' });
    await expectNeedsAction(page, '需要你的仲裁');
    await expect(page.getByTestId('ws-arbitration-card')).toHaveCount(1);
  });

  test('T017 oft-01, wang took part and cannot arbitrate: participated note', async ({ page }) => {
    await openUnit(page, { task_id: 'T017', sample_id: 'oft-01-even-tie', reviewer_id: 'reviewer_wang' });
    await expectStatusNote(page, '你已參與此單位，等待其他具資格審核員處理');
  });

  test('T017 oft-01, lin neither took part nor can arbitrate: waiting for an arbiter', async ({ page }) => {
    await openUnit(page, { task_id: 'T017', sample_id: 'oft-01-even-tie', reviewer_id: 'reviewer_lin' });
    await expectStatusNote(page, '等待具仲裁資格的審核員處理');
  });

  test('the disputed hint never repeats vote counts or the non-convergence reason', async ({ page }) => {
    for (const reviewer_id of ['reviewer_chen', 'reviewer_wang', 'reviewer_lin']) {
      await openUnit(page, { task_id: 'T016', sample_id: 'ofm-05-all-divergent', reviewer_id });
      const text = await hint(page).innerText();
      expect(text).not.toMatch(/\d/);
      expect(text).not.toMatch(/no_majority|even_tie|all_divergent|pure_reject|票/);
    }
  });

  test('English disputed copy', async ({ page }) => {
    await openUnit(page, { task_id: 'T017', sample_id: 'oft-01-even-tie' });
    await page.getByTestId('lang-toggle').click();
    await expect(hint(page)).toHaveText('Your arbitration is needed');

    await openUnit(page, { task_id: 'T017', sample_id: 'oft-01-even-tie', reviewer_id: 'reviewer_wang' });
    await page.getByTestId('lang-toggle').click();
    await expect(hint(page)).toHaveText('You have reviewed this unit; waiting for an eligible reviewer to resolve it');

    await openUnit(page, { task_id: 'T017', sample_id: 'oft-01-even-tie', reviewer_id: 'reviewer_lin' });
    await page.getByTestId('lang-toggle').click();
    await expect(hint(page)).toHaveText('Waiting for a reviewer with arbitration rights');
  });
});

test.describe('AC-4.49 — pending has no hint; finalized / null are plain notes; needs-action only twice', () => {
  test('T017 oft-05 pending: no hint at all, the controls below are the instruction', async ({ page }) => {
    await openUnit(page, { task_id: 'T017', sample_id: 'oft-05-pending-review' });
    await expect(page.getByTestId('ws-review-submit-btn')).toBeVisible();
    await expect(hint(page)).toHaveCount(0);
    await expect(page.locator('[data-needs-action]')).toHaveCount(0);
  });

  test('T015 ofs-04 pending (min 1): still no hint', async ({ page }) => {
    await openUnit(page, { task_id: 'T015', sample_id: 'ofs-04-pending-review' });
    await expect(hint(page)).toHaveCount(0);
  });

  test('T016 ofm-01 finalized: read-only note without CTA', async ({ page }) => {
    await openUnit(page, { task_id: 'T016', sample_id: 'ofm-01-unanimous-gold' });
    await expect(banner(page).locator('.rv-unit-state')).toHaveAttribute('data-terminal', 'true');
    await expectStatusNote(page, '已定稿，此單位為唯讀');
    await expect(page.locator('[data-needs-action]')).toHaveCount(0);
  });

  test('T015 ofs-05 null (annotator never submitted): waiting for the annotator', async ({ page }) => {
    await openUnit(page, { task_id: 'T015', sample_id: 'ofs-05-not-submitted' });
    await expect(banner(page).locator('.rv-unit-state')).toHaveText('尚無標記提交');
    await expectStatusNote(page, '等待標記員提交');
    await expect(page.locator('[data-needs-action]')).toHaveCount(0);
  });

  test('English finalized / null copy', async ({ page }) => {
    await openUnit(page, { task_id: 'T016', sample_id: 'ofm-01-unanimous-gold' });
    await page.getByTestId('lang-toggle').click();
    await expect(hint(page)).toHaveText('Finalized; this unit is read-only');

    await openUnit(page, { task_id: 'T015', sample_id: 'ofs-05-not-submitted' });
    await page.getByTestId('lang-toggle').click();
    await expect(hint(page)).toHaveText('Waiting for the annotator to submit');
  });

  test('exactly one hint per unit, re-derived when the reviewer switches units', async ({ page }) => {
    await openUnit(page, { task_id: 'T016', sample_id: 'ofm-02-approved-interim' });
    await expect(hint(page)).toHaveText('需要你的審核');

    await page.getByTestId('ws-next-btn').click();
    await expect(page).toHaveURL(/ofm-03-modified-interim/);
    await expect(hint(page)).toHaveCount(1);
    await expect(hint(page)).toHaveText('需要你的審核');
  });
});

test.describe('AC-4.50 — DOM order, 375px, run_type parity, reverse copy guard', () => {
  const BANNER_CHILDREN_INTERACTIVE = [
    'rv-unit-chip rv-unit-run',
    'rv-unit-state rv-unit-state-approved',
    'rv-unit-chip rv-unit-threshold',
    'rv-flow-trigger',
    'rv-review-note',
  ];

  test('the hint is the banner\'s next sibling and the banner children are unchanged', async ({ page }) => {
    await openUnit(page, { task_id: 'T016', sample_id: 'ofm-02-approved-interim' });

    const children = await banner(page).evaluate((el) => Array.from(el.children).map((c) => c.className));
    expect(children).toEqual(BANNER_CHILDREN_INTERACTIVE);
    await expect(banner(page).locator(`[data-testid="${HINT}"]`)).toHaveCount(0);

    const isNextSibling = await banner(page).evaluate(
      (el, testId) => el.nextElementSibling?.getAttribute('data-testid') === testId,
      HINT,
    );
    expect(isNextSibling).toBe(true);
  });

  test('375px: run -> state -> threshold -> hint reads top-down with no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 780 });
    await openUnit(page, { task_id: 'T016', sample_id: 'ofm-02-approved-interim' });

    const children = await banner(page).evaluate((el) => Array.from(el.children).map((c) => c.className));
    expect(children).toEqual(BANNER_CHILDREN_INTERACTIVE);

    const bannerBox = await banner(page).boundingBox();
    const hintBox = await hint(page).boundingBox();
    expect(bannerBox).not.toBeNull();
    expect(hintBox).not.toBeNull();
    expect(hintBox!.y).toBeGreaterThanOrEqual(bannerBox!.y + bannerBox!.height - 1);

    // Semantic order is the DOM order; RWD must not reorder with CSS.
    expect(await hint(page).evaluate((el) => getComputedStyle(el).order)).toBe('0');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('dry_run T014 dry-05: same matrix as official_run', async ({ page }) => {
    await openUnit(page, { task_id: 'T014', sample_id: 'dry-05-pending-review', run_type: 'dry_run' });
    await expect(banner(page).locator('.rv-unit-run')).toHaveText('試標 R1');
    await expectNeedsAction(page, '需要你的仲裁');

    await openUnit(page, {
      task_id: 'T014', sample_id: 'dry-05-pending-review', run_type: 'dry_run', reviewer_id: 'reviewer_wang',
    });
    await expectStatusNote(page, '你已參與此單位，等待其他具資格審核員處理');
  });

  test('dry_run pending / finalized units follow the same rows', async ({ page }) => {
    await openUnit(page, {
      task_id: 'T014', sample_id: 'dry-05-pending-review', run_type: 'dry_run', annotator_id: '113450022',
    });
    await expect(hint(page)).toHaveCount(0);

    await openUnit(page, { task_id: 'T014', sample_id: 'dry-01-all-agree', run_type: 'dry_run' });
    await expectStatusNote(page, '已定稿，此單位為唯讀');
  });

  test('dry_run hints never describe the official-run rollback', async ({ page }) => {
    const units = [
      { sample_id: 'dry-05-pending-review', reviewer_id: 'reviewer_chen' },
      { sample_id: 'dry-05-pending-review', reviewer_id: 'reviewer_wang' },
      { sample_id: 'dry-01-all-agree', reviewer_id: 'reviewer_chen' },
    ];
    for (const unit of units) {
      await openUnit(page, { task_id: 'T014', run_type: 'dry_run', ...unit });
      const text = await hint(page).innerText();
      expect(text).not.toContain('回到待標記');
      expect(text).not.toContain('重標待辦');
      expect(text).not.toMatch(/退回|送出後/);
    }
  });
});
