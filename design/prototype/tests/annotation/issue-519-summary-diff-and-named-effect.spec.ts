import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, skipGuidelineModal } from './_workspace-helpers';

/* Pre-submit summary: one-line diff with a readable changed/unchanged badge,
 * and an official_run consequence that names the annotator (issue #519,
 * spec 015 FR-077 / AC-3.42).
 *
 * Two of the duplications issue #519 names survived the issue #515 chain:
 *
 *   1. Every row spent two full lines restating the same pair of values --
 *      「標記員原答案：neutral」then「Reviewer 修正後答案：neutral」-- and
 *      whether they actually DIFFER was only ever readable from the
 *      `data-changed` attribute (plus a border colour). A reviewer scanning
 *      a three-output task had to compare the two strings by eye, per row,
 *      to answer the one question the row exists to answer.
 *
 *   2. `ws-review-summary-effect` promised, for official_run, that a reject
 *      「產生標記員重標待辦」-- for an unnamed abstract annotator, on a
 *      screen whose whole purpose is reviewing ONE named annotator's work.
 *
 * These tests pin the CARRIER, not just the presence of the information:
 * the two answers must live inside a single diff line (the old two-line
 * `.rv-summary-line` layout must be gone, so a fix that merely deletes one
 * of them fails here), the badge must carry readable text rather than only
 * colour, and the named annotator must be additive -- the existing
 * consequence sentence has to survive alongside the name.
 *
 * Explicitly NOT in scope: the single-output-type collapse of
 * `ws-review-summary-row` / `-original` / `-corrected` / `-pending` that
 * issue #519 also asks for. AC-3.44 (v4.45.0) pins those six testids as
 * unchanged after expanding, so removing them needs a spec ruling first.
 */

const ANNOTATOR = 'kioleemg12';
/* A second roster annotator, so the name in the consequence is proven to
 * track the unit under review rather than being a hardcoded default. */
const OTHER_ANNOTATOR = '113450022';

const T001_OFFICIAL = buildWorkspaceUrl({
  task_id: 'T001',
  sample_id: 'sent-001',
  role: 'reviewer',
  run_type: 'official_run',
});

const T001_DRY = buildWorkspaceUrl({
  task_id: 'T001',
  sample_id: 'sent-001',
  role: 'reviewer',
  run_type: 'dry_run',
});

/* T013 (absa-001) ships three output types, so it is the multi-output case
 * where per-row changed/unchanged has to be answerable row by row. */
const T013_OFFICIAL = buildWorkspaceUrl({
  task_id: 'T013',
  sample_id: 'absa-001',
  role: 'reviewer',
  run_type: 'official_run',
});

const summaryRow = (page: Page, outKey: string) =>
  page.locator(`[data-testid="ws-review-summary-row"][data-outkey="${outKey}"]`);

async function expandSummary(page: Page): Promise<void> {
  const toggle = page.getByTestId('ws-review-summary-toggle');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
}

async function flipSingleLabel(page: Page): Promise<string> {
  const correction = page.getByTestId('ws-review-correct-single_label');
  const negative = correction.getByTestId('ws-single-label-chip-negative');
  const positive = correction.getByTestId('ws-single-label-chip-positive');
  const negativePressed = (await negative.getAttribute('aria-pressed')) === 'true';
  const target = negativePressed ? positive : negative;
  await target.click();
  await expect(target).toHaveAttribute('aria-pressed', 'true');
  return negativePressed ? 'positive' : 'negative';
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

/* ── the two answers collapse onto one diff line ──────────────────────── */

test.describe('The summary row states original and corrected as one diff line (issue #519)', () => {
  test('both answers live inside a single diff line, and the old two-line layout is gone', async ({
    page,
  }) => {
    await page.goto(T001_OFFICIAL);
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-review-row-approve').click();
    await expandSummary(page);

    const row = summaryRow(page, 'single_label');
    const diff = row.getByTestId('ws-review-summary-diff');
    await expect(diff).toHaveCount(1);
    await expect(diff).toBeVisible();

    // The carrier assertion: BOTH answers are inside that one line. A fix
    // that dropped either testid, or left them as two stacked lines, fails.
    await expect(diff.getByTestId('ws-review-summary-original')).toHaveCount(1);
    await expect(diff.getByTestId('ws-review-summary-corrected')).toHaveCount(1);
    await expect(row.locator('.rv-summary-line')).toHaveCount(0);

    // ... and the data contract AC-3.42 / AC-3.44 pin is untouched.
    await expect(row.getByTestId('ws-review-summary-original')).not.toHaveAttribute('data-answer', '');
    await expect(row.getByTestId('ws-review-summary-corrected')).not.toHaveAttribute('data-answer', '');
  });

  test('the diff line keeps the two answers distinguishable without the visual labels', async ({
    page,
  }) => {
    await page.goto(T001_OFFICIAL);
    await dismissGuidelineModal(page);

    const newValue = await flipSingleLabel(page);
    await page.getByTestId('ws-review-row-approve').click();
    await expandSummary(page);

    const row = summaryRow(page, 'single_label');
    const original = row.getByTestId('ws-review-summary-original');
    const corrected = row.getByTestId('ws-review-summary-corrected');

    // Visually the arrow carries the direction, so each half must still say
    // which one it is to a screen reader.
    await expect(original).toHaveAttribute('aria-label', /標記員原答案/);
    await expect(corrected).toHaveAttribute('aria-label', /Reviewer 修正後答案/);
    await expect(corrected).toHaveAttribute('data-answer', newValue);
    await expect(corrected).toHaveText(newValue);
  });
});

/* ── data-changed becomes readable text, not only an attribute ─────────── */

test.describe('Each row says changed / unchanged in words (issue #519)', () => {
  test('an untouched row is badged 未修改 and a corrected row is badged 已修改', async ({ page }) => {
    await page.goto(T001_OFFICIAL);
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-review-row-approve').click();
    await expandSummary(page);

    const row = summaryRow(page, 'single_label');
    const badge = row.getByTestId('ws-review-summary-changed-badge');
    await expect(row).toHaveAttribute('data-changed', 'false');
    await expect(badge).toHaveCount(1);
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText('未修改');

    // Now correct the answer: the badge must follow data-changed, in words.
    await flipSingleLabel(page);
    await page.getByTestId('ws-review-row-approve').click();
    await expandSummary(page);

    const changedRow = summaryRow(page, 'single_label');
    await expect(changedRow).toHaveAttribute('data-changed', 'true');
    await expect(changedRow.getByTestId('ws-review-summary-changed-badge')).toHaveText('已修改');
  });

  test('on a three-output task the badge is per row, not one verdict for the unit', async ({
    page,
  }) => {
    await page.goto(T013_OFFICIAL);
    await dismissGuidelineModal(page);

    // Undecided outputs force the summary open (AC-3.44), so no expand here.
    const badges = page.getByTestId('ws-review-summary-changed-badge');
    await expect(badges).toHaveCount(3);

    // Nothing has been corrected yet, so every row must read 未修改 -- an
    // implementation that badged the whole unit from a single flag would
    // still pass a one-row check, but not this one.
    for (let i = 0; i < 3; i += 1) {
      await expect(badges.nth(i)).toHaveText('未修改');
    }

    const rows = page.getByTestId('ws-review-summary-row');
    await expect(rows).toHaveCount(3);
    for (let i = 0; i < 3; i += 1) {
      await expect(rows.nth(i)).toHaveAttribute('data-changed', 'false');
      await expect(rows.nth(i).getByTestId('ws-review-summary-diff')).toHaveCount(1);
    }
  });
});

/* ── the official_run consequence names the annotator it applies to ────── */

test.describe('The submit consequence names the annotator (issue #519)', () => {
  test('official_run names the reviewed annotator in the re-annotation todo', async ({ page }) => {
    await page.goto(T001_OFFICIAL);
    await dismissGuidelineModal(page);

    const effect = page.getByTestId('ws-review-summary-effect');
    await expect(effect).toHaveAttribute('data-run-type', 'official_run');
    await expect(effect).toContainText(ANNOTATOR);
    // Additive, not a replacement: the existing consequence sentence that
    // AC-3.40 (v4.46.0) requires to live here has to survive the naming.
    await expect(effect).toContainText('回到待標記');
    await expect(effect).toContainText('產生標記員重標待辦');
  });

  test('dry_run does not name an annotator, because it rolls nobody back', async ({ page }) => {
    await page.goto(T001_DRY);
    await dismissGuidelineModal(page);

    const effect = page.getByTestId('ws-review-summary-effect');
    await expect(effect).toHaveAttribute('data-run-type', 'dry_run');
    await expect(effect).not.toContainText(ANNOTATOR);
    await expect(effect).toContainText('不會個別回退標記員狀態');
  });

  test('the name tracks the annotator actually under review, not a constant', async ({ page }) => {
    await page.goto(
      buildWorkspaceUrl({
        task_id: 'T001',
        sample_id: 'sent-001',
        role: 'reviewer',
        run_type: 'official_run',
        annotator_id: OTHER_ANNOTATOR,
      })
    );
    await dismissGuidelineModal(page);

    const effect = page.getByTestId('ws-review-summary-effect');
    await expect(effect).toHaveAttribute('data-run-type', 'official_run');
    await expect(effect).toContainText(OTHER_ANNOTATOR);
    await expect(effect).not.toContainText(ANNOTATOR);
  });
});
