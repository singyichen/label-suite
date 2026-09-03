/**
 * FR-064 banner simplification (issue #525 PR-B).
 * Source spec: specs/annotation/015-annotation-workspace/spec.md FR-064,
 * AC-4.27 / AC-4.32 / AC-4.35 / AC-4.37 / AC-4.38 / AC-4.39.
 *
 * PR-A moved the state track out of the banner into an on-demand drawer but
 * deliberately left the surviving children in the order it found them
 * (run -> threshold -> state). issue #525 ♿ writes the reading order the
 * other way round -- run type -> state -> threshold -- because the question
 * a reviewer opens a unit with is "where is this unit now", and the
 * threshold only qualifies that answer. issue #596 (AC-4.37) then deleted
 * the threshold chip outright: one reviewer owns a unit, so there is no
 * quorum left to qualify anything. The order this spec pins is therefore
 * run type -> state -> trigger -> note.
 *
 * Two other banner facts land with the reorder: a dry run is one of
 * several rounds, so its chip must say WHICH (試標 R{round}, falling back
 * to R1 exactly as annotation-list.html:1866 already does), and the state
 * element carried a 目前：/ Now: prefix (retired by issue #572) so it cannot be
 * misread as a decision the reviewer is being asked to make.
 *
 * Out of PR-B's scope, deliberately not asserted here: rendering only the
 * min_reviewers-reachable nodes inside the drawer (PR-C).
 */
import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* Parallel workers hammering the static server occasionally drop a
   <script src>; same retry guard the sibling review-unit specs carry. */
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

function childClasses(page: Page) {
  return banner(page).evaluate((el) => Array.from(el.children).map((c) => c.className));
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #525 PR-B — banner DOM order is run type -> state -> threshold', () => {
  test('T016 ofm-02: the state element sits right after the run chip', async ({ page }) => {
    await openUnit(page, { task_id: 'T016', sample_id: 'ofm-02-approved-interim', annotator_id: 'kioleemg12' });

    expect(await childClasses(page)).toEqual([
      'rv-unit-chip rv-unit-run',
      'rv-unit-state rv-unit-state-finalized',
      // issue #550's decision-note tooltip trails the flow trigger, but only
      // on units that still show decisions. issue #596 finalizes this unit
      // (the reviewer's approve closes it outright, with no quorum left to
      // wait for), so the note is out and the trigger is last. Its position
      // on an interactive unit is pinned in issue-596-unit-context.spec.ts.
      'rv-flow-trigger',
    ]);
  });

  test('375px keeps the same reading order (issue #525 ♿ last clause)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 780 });
    await openUnit(page, { task_id: 'T017', sample_id: 'oft-01-final-exception' });

    expect(await childClasses(page)).toEqual([
      'rv-unit-chip rv-unit-run',
      'rv-unit-state rv-unit-state-disputed',
      'rv-flow-trigger',
    ]);
  });

  test('a unit with no annotator submission keeps the order minus the trigger', async ({ page }) => {
    await openUnit(page, { task_id: 'T015', sample_id: 'ofs-05-not-submitted' });

    expect(await childClasses(page)).toEqual([
      'rv-unit-chip rv-unit-run',
      'rv-unit-state',
    ]);
  });
});

test.describe('issue #525 PR-B — the dry-run chip names its round', () => {
  test('T004 has a materialized dry run R2, so the chip says 試標 R2', async ({ page }) => {
    await openUnit(page, { task_id: 'T004', sample_id: 'read-001', run_type: 'dry_run', annotator_id: 'kioleemg12' });

    await expect(banner(page).locator('.rv-unit-run')).toHaveText('試標 R2');
  });

  test('T014 materialized no dry run, so the chip falls back to 試標 R1', async ({ page }) => {
    // Same fallback rule as annotation-list.html:1866 (round ?? 1) -- the
    // two pages must not disagree about which round a reviewer is in.
    await openUnit(page, { task_id: 'T014', sample_id: 'dry-01-all-agree', run_type: 'dry_run', annotator_id: 'kioleemg12' });

    await expect(banner(page).locator('.rv-unit-run')).toHaveText('試標 R1');
  });

  test('the round survives the language toggle', async ({ page }) => {
    await openUnit(page, { task_id: 'T004', sample_id: 'read-001', run_type: 'dry_run', annotator_id: 'kioleemg12' });
    await page.getByTestId('lang-toggle').click();

    await expect(banner(page).locator('.rv-unit-run')).toHaveText('Dry Run R2');
  });

  test('official_run keeps its unnumbered chip', async ({ page }) => {
    await openUnit(page, { task_id: 'T015', sample_id: 'ofs-01-agree-gold' });

    await expect(banner(page).locator('.rv-unit-run')).toHaveText('正式標記');
    await page.getByTestId('lang-toggle').click();
    await expect(banner(page).locator('.rv-unit-run')).toHaveText('Official Run');
  });

  test('the breadcrumb run label is NOT numbered', async ({ page }) => {
    // crumbTaskTpl consumes the same unitCtxRunDry key by substitution, so a
    // round token added to that key would leak an unreplaced {round} here.
    await openUnit(page, { task_id: 'T004', sample_id: 'read-001', run_type: 'dry_run', annotator_id: 'kioleemg12' });

    const crumb = page.locator('nav.breadcrumb[data-testid="entry-breadcrumb"]');
    await expect(crumb).toContainText('（試標）');
    await expect(crumb).not.toContainText('{round}');
  });
});

test.describe('issue #525 PR-B — the state element text (issue #572: no 目前： prefix)', () => {
  test('T014 dry-01: finalized state and its note, unprefixed', async ({ page }) => {
    await openUnit(page, { task_id: 'T014', sample_id: 'dry-01-all-agree', run_type: 'dry_run', annotator_id: 'kioleemg12' });

    await expect(statePill(page)).toHaveText('已定稿 · 已鎖定');
  });

  test('T017 oft-01: disputed state and its note, unprefixed', async ({ page }) => {
    await openUnit(page, { task_id: 'T017', sample_id: 'oft-01-final-exception' });

    await expect(statePill(page)).toHaveText('爭議中 · 未定稿，待仲裁');
  });

  test('English is unprefixed too', async ({ page }) => {
    await openUnit(page, { task_id: 'T017', sample_id: 'oft-01-final-exception' });
    await page.getByTestId('lang-toggle').click();

    await expect(statePill(page)).toHaveText('Disputed · not finalized, awaiting arbitration');
  });

  test('a null status shows the empty-unit text', async ({ page }) => {
    await openUnit(page, { task_id: 'T015', sample_id: 'ofs-05-not-submitted' });

    await expect(statePill(page)).toHaveText('尚無標記提交');
    /* issue #596: the 定稿門檻 0 / 1 reading went with the chip -- there is
       no quorum to be 0 of. The banner must not say it under any state. */
    await expect(banner(page)).not.toContainText('定稿門檻');
    await expect(page.getByTestId('ws-review-flow-trigger')).toHaveCount(0);
  });

  test('the aria-label and data-terminal contract', async ({ page }) => {
    await openUnit(page, { task_id: 'T014', sample_id: 'dry-01-all-agree', run_type: 'dry_run', annotator_id: 'kioleemg12' });

    // AC-4.35: the accessible name is the state plus, when terminal, the
    // fact that the unit is locked. issue #596 dropped the threshold
    // reading it used to carry.
    await expect(statePill(page)).toHaveAttribute(
      'aria-label',
      '審核單位狀態：已定稿，內容已鎖定',
    );
    await expect(statePill(page)).toHaveAttribute('data-terminal', 'true');
  });

  test('a non-terminal state keeps data-terminal false and a bare aria-label', async ({ page }) => {
    await openUnit(page, { task_id: 'T017', sample_id: 'oft-01-final-exception' });

    await expect(statePill(page)).toHaveAttribute('data-terminal', 'false');
    await expect(statePill(page)).toHaveAttribute(
      'aria-label',
      '審核單位狀態：爭議中',
    );
  });
});

test.describe('issue #525 PR-B — the state appears exactly once in the banner', () => {
  test('one state element, no track, no repeated state word', async ({ page }) => {
    await openUnit(page, { task_id: 'T017', sample_id: 'oft-01-final-exception' });

    await expect(statePill(page)).toHaveCount(1);
    await expect(banner(page).locator('.review-track')).toHaveCount(0);
    await expect(banner(page).locator('.review-track-node')).toHaveCount(0);

    // Reverse pin: 爭議中 is carried by the state element and nothing else
    // in the banner, so deleting the element cannot leave the test green.
    const text = (await banner(page).innerText()).replace(/\s+/g, '');
    expect(text.split('爭議中').length - 1).toBe(1);
    await expect(statePill(page)).toContainText('爭議中');
  });
});
